# Chart control functions enhancement for ChartJS
A chartjs plugin for **zooming**, **panning** and **selecting** data in a chartjs instance.

See the [example](https://jjppof.github.io/chartjs-plugin-zoom-pan-select/example/index).

### Install:

```
npm install @jjppof/chartjs-plugin-zoom-pan-select
```

### Requirements:

Due to performance reasons, your canvas need to have opaque background. Suggestion on options:

```javascript
[{
    beforeDraw: (chart) => {
        chart.ctx.fillStyle = "white";
        chart.ctx.fillRect(0, 0, chart.canvas.offsetWidth, chart.canvas.offsetHeight);
    }
}]
```

### Usage:

```javascript
import ChartJSEnhancements from '@jjppof/chartjs-plugin-zoom-pan-select';

let enhancer = new ChartJSEnhancements(chartjs_object);
enhancer.initialize(mouse_buttons);
/* 
mouse_buttons is an optional object with the mouse button number for each chart action (pan, zoom or select).
More info about the numbers: https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons#Return_value

Example:
mouse_buttons = {
    zoom: zoom_button_value, //optional
    select: select_button_value, //optional
    pan: pan_button_value //optional
};
*/
```

### Methods:

```javascript
initialize(mouse_buttons); // explained on Usage section
setAction(action); //sets the mode of the chart if no mouse button is defined. The arg is a string that can be "zoom", "pan" or "select"
setAfterSelectHandler(callable); //callable with select points array as arg
setAfterUnselectHandler(callable);
setZoomXFactor(factor); //factor is a number
setZoomYFactor(factor);
unselectPoints(update); //boolean that says if the chart is going to update or not
resetZoom(update, update_options); //boolean that says if the chart is going to update or not. update_options is the update options from chartjs update() function
```
