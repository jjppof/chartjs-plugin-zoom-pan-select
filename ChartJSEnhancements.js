import * as Chart from 'chart.js';

export default class ChartJSEnhancements {
    constructor(chartjs_object, change_point_radius = true) {
        this.chartjs_object = chartjs_object;
        this.canvas = chartjs_object.canvas;
        this.ctx = this.chartjs_object.ctx;
        this.datasets = this.chartjs_object.data.datasets;
        this.data_length = this.datasets.reduce(function(accumulator, dataset) {
            return accumulator + dataset.data.length;
        }, 0);
        this.quick_mode = this.data_length > 2000 ? true : false;

        this.chartjs_object.options.hoverMode = this.quick_mode ? null : Chart.defaults.global.hover.mode;
        this.chartjs_object.options.hover.animationDuration = this.quick_mode ? 0 : 200;
        this.change_point_radius = change_point_radius;
        if (this.change_point_radius) {
            for (let i = 0; i < this.datasets.length; ++i) {
                this.datasets[i].pointRadius = Array(this.datasets[i].data.length);
                this.datasets[i].pointBorderWidth = Array(this.datasets[i].data.length);
            }
        }
        this.chartjs_object.update({duration: 0});
    }

    setMinMax() {
        const x_axis_id = this.chartjs_object.options.scales.xAxes[0].id;
        this.chartjs_object.options.scales.xAxes[0].ticks.min = this.chartjs_object.scales[x_axis_id].min;
        this.chartjs_object.options.scales.xAxes[0].ticks.max = this.chartjs_object.scales[x_axis_id].max;
        for (let i in this.chartjs_object.options.scales.yAxes) {
            const y_axis_id = this.chartjs_object.options.scales.yAxes[i].id;
            this.chartjs_object.options.scales.yAxes[i].ticks.min = this.chartjs_object.scales[y_axis_id].min;
            this.chartjs_object.options.scales.yAxes[i].ticks.max = this.chartjs_object.scales[y_axis_id].max;
        }
    }
    
    resetZoom(update = true, update_options = {}) {
        this.chartjs_object.options.scales.xAxes[0].ticks.min = undefined;
        this.chartjs_object.options.scales.xAxes[0].ticks.max = undefined;
        for (let i in this.chartjs_object.options.scales.yAxes) {
            this.chartjs_object.options.scales.yAxes[i].ticks.min = undefined;
            this.chartjs_object.options.scales.yAxes[i].ticks.max = undefined;
        }
        if (update) this.chartjs_object.update(Object.assign({
            duration: this.quick_mode ? 0 : 150
        }, update_options));
        this.setMinMax();
    }

    unselectPoints(update = true) {
        this.selected_points = [];
        if (this.change_point_radius) {
            this.datasets.forEach(dataset => {
                dataset.pointRadius = Array(dataset.data.length);
                dataset.pointBorderWidth = Array(dataset.data.length);
            });
        }
        if (update) this.chartjs_object.update({duration: this.quick_mode ? 0 : 300});
        if (this.after_unselect_handler !== undefined) this.after_unselect_handler();
    }

    clickHandler(event) {
        if (event.type === 'mousedown') {
            const is_inside = event.offsetX <= this.chartjs_object.chartArea.right && event.offsetX >= this.chartjs_object.chartArea.left &&
            event.offsetY <= this.chartjs_object.chartArea.bottom && event.offsetY >= this.chartjs_object.chartArea.top; 
            if (!is_inside) {
                this.cancel = true;
                return;
            }
            this.ignore_mouse_button = false;
            this.previous_action = this.action;
            switch (event.buttons) {
                case this.action_buttons.zoom:
                    this.action = "zoom";
                    break;
                case this.action_buttons.select:
                    this.action = "select";
                    break;
                case this.action_buttons.pan:
                    this.action = "pan";
                    break;
                default:
                    this.ignore_mouse_button = true;
                    if (event.shiftKey) {
                        this.action = "pan";
                        this.using_shift = true;
                    }
            }
            this.chartjs_object.unbindEvents();
            this.rect_selector.startX = event.offsetX;
            this.rect_selector.startY = event.offsetY;
            this.drag = true;
            this.initial_time = event.timeStamp;
            if (this.action === "select") this.selecting_points = true;
            if (this.action === "pan") this.panning = true;
            this.resetPoints();
            this.mouse_button_value = event.buttons;
            if (this.panning) {
                if (this.data_length > 8000) {
                    for(let i = 0; i < this.points_backup.length; ++i) {
                        this.points_backup[i] = this.datasets[i].data;
                        this.datasets[i].data = this.datasets[i].data.filter((datum, index) => {
                            return (index&7) === 0;
                        });
                    }
                }
                this.setMinMax();
            } else {
                this.temp_canvas.width = this.chartjs_object.canvas.offsetWidth;
                this.temp_canvas.height = this.chartjs_object.canvas.offsetHeight;
                this.temp_ctx.clearRect(0, 0, this.chartjs_object.canvas.offsetWidth, this.chartjs_object.canvas.offsetHeight);
                if ((this.chartjs_object.canvas.offsetWidth !== this.chartjs_object.canvas.width) || 
                    (this.chartjs_object.canvas.offsetHeight !== this.chartjs_object.canvas.height)) {
                    createImageBitmap(this.chartjs_object.canvas, {
                        resizeWidth: this.chartjs_object.canvas.offsetWidth,
                        resizeHeight: this.chartjs_object.canvas.offsetHeight,
                        resizeQuality: "high"
                    }).then(image => {
                        this.temp_ctx.fillStyle = this.temp_background_color;
                        this.temp_ctx.fillRect(0, 0, this.temp_canvas.width, this.temp_canvas.height);
                        this.temp_ctx.drawImage(image, 0, 0);
                    }).catch(err => {
                        this.temp_ctx.fillStyle = this.temp_background_color;
                        this.temp_ctx.fillRect(0, 0, this.temp_canvas.width, this.temp_canvas.height);
                        this.temp_ctx.drawImage(this.chartjs_object.canvas, 0, 0, this.chartjs_object.canvas.width,
                            this.chartjs_object.canvas.height, 0, 0, this.chartjs_object.canvas.offsetWidth,
                            this.chartjs_object.canvas.offsetHeight);
                    });
                } else {
                    this.temp_ctx.fillStyle = this.temp_background_color;
                    this.temp_ctx.fillRect(0, 0, this.temp_canvas.width, this.temp_canvas.height);
                    this.temp_ctx.drawImage(this.chartjs_object.canvas, 0, 0);
                }
            }
        }

        const width = this.chartjs_object.chartArea.right - this.chartjs_object.chartArea.left;
        const point_px_x = event.offsetX - this.chartjs_object.chartArea.left;
        const ratio_x = point_px_x/width;
        const x_axis_id = this.chartjs_object.options.scales.xAxes[0].id;
        const point_x = (this.chartjs_object.scales[x_axis_id].max - this.chartjs_object.scales[x_axis_id].min)*ratio_x + this.chartjs_object.scales[x_axis_id].min;
        this.selector_points.x.push(point_x);

        const height = this.chartjs_object.chartArea.bottom - this.chartjs_object.chartArea.top;
        const point_px_y = event.offsetY - this.chartjs_object.chartArea.top;
        const ratio_y = point_px_y/height;
        for (let i in this.chartjs_object.options.scales.yAxes) {
            const y_axis_id = this.chartjs_object.options.scales.yAxes[i].id;
            let point_y;
            if (this.chartjs_object.options.scales.yAxes[i].ticks.reverse) {
                point_y = this.chartjs_object.scales[y_axis_id].min - (this.chartjs_object.scales[y_axis_id].min - this.chartjs_object.scales[y_axis_id].max)*ratio_y;
            } else {
                point_y = this.chartjs_object.scales[y_axis_id].max - (this.chartjs_object.scales[y_axis_id].max - this.chartjs_object.scales[y_axis_id].min)*ratio_y;
            }
            this.selector_points.y[y_axis_id].push(point_y);
        }

        if (event.type === 'mouseup' && (this.ignore_mouse_button || this.mouse_button_value === this.action_buttons[this.action])) {
            if (this.cancel) {
                this.cancel = false;
                return;
            }
            const delta_time = event.timeStamp - this.initial_time;
            if (!this.panning && delta_time >= this.time_limit) {
                this.chartjs_object.draw();
                let x_min_max_data = {min: Math.min(...this.selector_points.x), max: Math.max(...this.selector_points.x)};
                let y_min_max_data = {};
                for (let i in this.chartjs_object.options.scales.yAxes) {
                    y_min_max_data[this.chartjs_object.options.scales.yAxes[i].id] = {
                        min: Math.min(...this.selector_points.y[this.chartjs_object.options.scales.yAxes[i].id]),
                        max: Math.max(...this.selector_points.y[this.chartjs_object.options.scales.yAxes[i].id])
                    };
                }
                if (!this.selecting_points) {
                    this.chartjs_object.options.scales.xAxes[0].ticks.min = x_min_max_data.min;
                    this.chartjs_object.options.scales.xAxes[0].ticks.max = x_min_max_data.max;
                    for (let i in this.chartjs_object.options.scales.yAxes) {
                        if (this.chartjs_object.options.scales.yAxes[i].ticks.reverse) {
                            this.chartjs_object.options.scales.yAxes[i].ticks.max = y_min_max_data[this.chartjs_object.options.scales.yAxes[i].id].min;
                            this.chartjs_object.options.scales.yAxes[i].ticks.min = y_min_max_data[this.chartjs_object.options.scales.yAxes[i].id].max;
                        } else {
                            this.chartjs_object.options.scales.yAxes[i].ticks.max = y_min_max_data[this.chartjs_object.options.scales.yAxes[i].id].max;
                            this.chartjs_object.options.scales.yAxes[i].ticks.min = y_min_max_data[this.chartjs_object.options.scales.yAxes[i].id].min;
                        }
                    }
                } else if (this.action === "select") {
                    let filtered = Array(this.data_length);
                    let j = 0;
                    for (let i = 0; i < this.datasets.length; ++i) {
                        let dataset = this.datasets[i];
                        for (let index = 0; index < this.datasets.length; ++index) {
                            let datum = this.datasets[index];
                            const is_inside = datum.x <= x_min_max_data.max && datum.x >= x_min_max_data.min &&
                                datum.y <= y_min_max_data[dataset.yAxisID].max && datum.y >= y_min_max_data[dataset.yAxisID].min;
                            datum.index = index;
                            if (is_inside) {
                                if (this.change_point_radius) {
                                    dataset.pointRadius[index] = 5;
                                    dataset.pointBorderWidth[index] = 2;
                                }
                                filtered[j++] = {
                                    x: datum.x,
                                    y: datum.y,
                                    dataset: dataset.label,
                                    index: datum.index,
                                }
                            } else if (this.change_point_radius) {
                                dataset.pointRadius[index] = 3;
                                dataset.pointBorderWidth[index] = 1;
                            }
                        }
                    }
                    filtered = filtered.slice(0, j);
                    this.selected_points = filtered;
                    if (this.after_select_handler !== undefined) this.after_select_handler(this.selected_points);
                }
            } else if (delta_time < this.time_limit) {
                this.unselectPoints();
            } else if (this.panning) {
                if (this.data_length > 8000) {
                    for(let i = 0; i < this.points_backup.length; ++i) {
                        this.datasets[i].data = this.points_backup[i];
                    }
                }
            }
            this.chartjs_object.bindEvents();
            this.chartjs_object.update({duration: this.quick_mode ? 0 : 150});
            this.drag = false;
            this.panning = false;
            this.mouse_button_value = 0;
            this.selecting_points = false;
            if (!this.ignore_mouse_button || this.using_shift) {
                this.action = this.previous_action;
                this.using_shift = false;
            };
        }
    }

    mousemoveHandler(event) {
        if (!this.drag) return;
        if (!this.panning) {
            this.rect_selector.w = event.offsetX - this.rect_selector.startX;
            this.rect_selector.h = event.offsetY - this.rect_selector.startY;
            this.ctx.clearRect(0, 0, this.chartjs_object.canvas.offsetWidth, this.chartjs_object.canvas.offsetHeight);
            this.ctx.drawImage(this.temp_canvas, 0, 0);
            const backup = this.ctx.strokeStyle;
            this.ctx.strokeStyle = "#444";
            this.ctx.strokeRect(this.rect_selector.startX, this.rect_selector.startY, this.rect_selector.w, this.rect_selector.h);
            this.ctx.strokeStyle = backup;
        } else if (this.action === "pan") {
            const width = event.offsetX - this.rect_selector.startX;
            const height = event.offsetY - this.rect_selector.startY;
            this.rect_selector.startX += width;
            this.rect_selector.startY += height;

            const x_axis_id = this.chartjs_object.options.scales.xAxes[0].id;
            const width_grid = this.chartjs_object.scales[x_axis_id].max - this.chartjs_object.scales[x_axis_id].min;
            const width_px = this.chartjs_object.chartArea.right - this.chartjs_object.chartArea.left;
            const width_transformed = width_grid*width/width_px;
            this.chartjs_object.options.scales.xAxes[0].ticks.min -= width_transformed;
            this.chartjs_object.options.scales.xAxes[0].ticks.max -= width_transformed;

            const height_px = this.chartjs_object.chartArea.bottom - this.chartjs_object.chartArea.top;
            const height_ratio = height/height_px;
            for (let i in this.chartjs_object.options.scales.yAxes) {
                const y_axis_id = this.chartjs_object.options.scales.yAxes[i].id;
                const height_grid = this.chartjs_object.scales[y_axis_id].max - this.chartjs_object.scales[y_axis_id].min;
                let height_transformed = height_grid*height_ratio;
                if (this.chartjs_object.options.scales.yAxes[i].ticks.reverse) {
                    height_transformed = -height_transformed;
                }
                this.chartjs_object.options.scales.yAxes[i].ticks.min += height_transformed;
                this.chartjs_object.options.scales.yAxes[i].ticks.max += height_transformed;
            }

            this.chartjs_object.update({duration: 0});
        }
    }

    resetPoints() {
        this.selector_points.y = Object.assign({}, ...Object.keys(this.chartjs_object.scales).map(k => ({[k]: []})));
        this.selector_points.x = [];
    }

    setAction(action) {
        this.action = action;
        this.previous_action = this.action;
    }

    setAfterSelectHandler(handler) {
        this.after_select_handler = handler;
    }

    setAfterUnselectHandler(handler) {
        this.after_unselect_handler = handler;
    }

    setZoomXFactor(factor) {
        this.zoom_x_factor = factor;
    }

    setZoomYFactor(factor) {
        this.zoom_y_factor = factor;
    }

    setBackgroundColor(color) {
        this.temp_background_color = color;
    }

    zoom(event) {
        event.preventDefault();
        if (this.chartjs_object.options.scales.xAxes[0].ticks.min === undefined || this.chartjs_object.options.scales.xAxes[0].ticks.max === undefined) {
            this.setMinMax();
        }
        const factor = Math.sign(event.deltaY) * -0.1;
        const width = this.chartjs_object.chartArea.right - this.chartjs_object.chartArea.left;
        const point_px_x = event.offsetX - this.chartjs_object.chartArea.left;
        const ratio_x = point_px_x/width;
        const width_view = this.chartjs_object.options.scales.xAxes[0].ticks.max - this.chartjs_object.options.scales.xAxes[0].ticks.min;
        this.chartjs_object.options.scales.xAxes[0].ticks.min += this.zoom_x_factor * factor * ratio_x * width_view;
        this.chartjs_object.options.scales.xAxes[0].ticks.max -= this.zoom_x_factor * factor * (1 - ratio_x) * width_view;

        const height = this.chartjs_object.chartArea.bottom - this.chartjs_object.chartArea.top;
        const point_px_y = event.offsetY - this.chartjs_object.chartArea.top;
        const ratio_y = point_px_y/height;
        for (let i in this.chartjs_object.options.scales.yAxes) {
            const width_view = this.chartjs_object.options.scales.yAxes[i].ticks.max - this.chartjs_object.options.scales.yAxes[i].ticks.min;
            if (this.chartjs_object.options.scales.yAxes[i].ticks.reverse) {
                this.chartjs_object.options.scales.yAxes[i].ticks.min += this.zoom_y_factor * factor * ratio_y * width_view;
                this.chartjs_object.options.scales.yAxes[i].ticks.max -= this.zoom_y_factor * factor * (1 - ratio_y) * width_view;
            } else {
                this.chartjs_object.options.scales.yAxes[i].ticks.min += this.zoom_y_factor * factor * (1 - ratio_y) * width_view;
                this.chartjs_object.options.scales.yAxes[i].ticks.max -= this.zoom_y_factor * factor * ratio_y * width_view;
            }
        }

        this.chartjs_object.update({duration: this.quick_mode ? 0 : 50});
    }

    destroy() {
        this.canvas = null;
        this.chartjs_object = null;
        this.ctx = null;
        this.datasets = null;
        this.temp_canvas = null;
        this.temp_ctx = null;
    }

    removeEventListeners() {
        for (let event_name in this.event_handlers) {
            this.canvas.removeEventListener(event_name, this.event_handlers[event_name]);
        }
    }

    initialize(action_buttons, background_color = 'white') {
        this.temp_canvas = document.createElement('canvas');
        this.temp_ctx = this.temp_canvas.getContext("2d", { alpha: false });
        this.temp_background_color = background_color;
        this.rect_selector = {};
        this.selector_points = {x: [], y: {}};
        this.resetPoints();
        this.setMinMax();
        this.drag = false;
        this.mouse_button_value = 0;
        this.selecting_points = false;
        this.panning = false;
        this.initial_time = 0;
        this.cancel = false;
        this.time_limit = 200;
        this.selected_points = [];
        this.points_backup = Array(this.datasets.length);
        this.action = "zoom";
        this.zoom_x_factor = 1;
        this.zoom_y_factor = 1;
        this.action_buttons = {
            zoom: 0,
            select: 0,
            pan: 0
        };
        if (action_buttons !== undefined) {
            this.action_buttons.zoom = action_buttons.zoom !== undefined ? action_buttons.zoom : 0;
            this.action_buttons.select = action_buttons.select !== undefined ? action_buttons.select : 0;
            this.action_buttons.pan = action_buttons.pan !== undefined ? action_buttons.pan : 0;
        }

        this.event_handlers = {
            'mousedown': this.clickHandler.bind(this),
            'mouseup': this.clickHandler.bind(this),
            'mousemove': this.mousemoveHandler.bind(this),
            'dblclick': () => { this.resetZoom() },
            'wheel': this.zoom.bind(this)
        };

        for (let event_name in this.event_handlers) {
            this.chartjs_object.canvas.addEventListener(event_name, this.event_handlers[event_name]);
        }
    }
}
