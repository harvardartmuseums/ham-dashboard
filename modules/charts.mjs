import * as Plot from "@observablehq/plot";
import * as d3 from "d3";
import {JSDOM} from "jsdom";

const dom = new JSDOM(``);

export function makeBarChart(data, x, y) {

    // see https://stackoverflow.com/questions/74573576/how-to-use-observable-plot-in-nodejs
    // see https://github.com/observablehq/plot/discussions/847?sort=top

    let plot = Plot.plot({
                    x: {
                        tickFormat: d3.format(",.1c"),
                        label: ""
                    }, 
                    y: {
                        label: ""
                    },
                    style: {
                        fontSize: "14px",
                    },
                    document: dom.window.document,
                    marks: [
                        Plot.barY(data, {x: x, y: y, fill: "grey"}),
                        Plot.ruleY([0])
                    ]
                });
    return plot.outerHTML;
}
