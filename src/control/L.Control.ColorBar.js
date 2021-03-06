/**
 *   Control for a simple legend with a colorbar
 *   References:
 *      - http://jsfiddle.net/ramnathv/g8stqcf6/
 *      - http://jsfiddle.net/vis4/cYLZH/
 */
L.Control.ColorBar = L.Control.extend({
    options: {
        position: 'bottomleft',
        width: 300, // for colorbar itself (control is wider)
        height: 15,
        margin: 15,
        background: '#fff',
        textColor: 'black',
        steps: 100,
        decimals: 2,
        units: 'uds', // ej: m/s
        title: 'Legend', // ej: Ocean Currents
        labels: [], // empty for no labels
        labelFontSize: 10,
        cb: null,
        index: 0,
        labelTextPosition: 'middle' // start | middle | end
    },

    initialize: function (color, range, options) {
        this.color = color; // 'chromajs' scale function
        this.range = range; // [min, max]
        L.Util.setOptions(this, options);
        console.log(this.options.index);
        d3.select(this.colorBar).attr('data-index', this.options.index);
        if (this.colorBar) this.unit = this._createUnitToggle(this.colorBar);
    },


    onAdd: function (map) {
        this._map = map;
        let div = L.DomUtil.create(
            'div',
            'leaflet-control-colorBar leaflet-bar leaflet-control'
        );
        this.colorBar = div;
        div.style.padding = '10px';
        L.DomEvent
            .addListener(div, 'click', L.DomEvent.stopPropagation)
            .addListener(div, 'click', L.DomEvent.preventDefault);
        div.style.backgroundColor = this.options.background;
        div.style.cursor = 'text';
        this.unit = this._createUnitToggle(div);
        div.innerHTML = this.title() + this.palette();
        L.DomEvent
            .addListener(div, 'click', this._nextUnit, this);
        return div;
    },


    title: function () {
        let d = document.createElement('div');
        let lb = '';
        if (this.unit.value().label !== '') {
            lb = '(' + this.unit.value().label + ')';
        }
        d3
            .select(d)
            .append('span')
            .style('color', this.options.textColor)
            .style('display', 'block')
            .style('margin-bottom', '5px')
            .attr('class', 'leaflet-control-colorBar-title')
            .text(this.options.title + lb);
        return d.innerHTML;
    },

    palette: function () {
        let d = document.createElement('div');
        let svg = this._createSvgIn(d);
        let ul = this._createUlIn(d);
        this._appendColorBarTo(svg);

        if (this.options.labels) {
            this._appendLabelsTo(svg);
            this._appendPhoneColorBarTo(ul);
        }

        return d.innerHTML;
    },

    _appendPhoneColorBarTo: function _appendPhoneColorBarTo(ul) {
        var that = this;
        var colorList = this.options.phoneColoe;
        var labels = this.options.labels;
        labels.forEach(function (value, key) {
            var currentText = that.unit.value().conversion(value);
            if (that.unit.value().precision || that.unit.value().precision === 0) {
                currentText = currentText.toFixed(that.unit.value().precision);
            }
            ul.insert('li', '.phone-color-li:nth-child(1)').attr('class', 'phone-color-li text-center')
                .text(currentText).style('color', 'white')
                .style('background-color', 'rgb(' + colorList[key][0] + ',' + colorList[key][1] + ',' + colorList[key][2] + ')');
        });
        ul.style('display', 'none');
    },
    _createUlIn: function _createSvgIn(d) {
        var ul = d3.select(d).append('ul').attr('id', 'phone_ul_color_bar').style('width', '50px').attr('class', 'leaflet-control-colorBar');
        return ul;
    },


    _createSvgIn: function (d) {
        let spaceForLabels = this.options.labels ? this.options.margin : 0;
        let svg = d3
            .select(d)
            .append('svg').attr('id', 'pc_svg_color_bar')
            .attr('width', this.options.width + this.options.margin * 2)
            .attr('height', this.options.height + spaceForLabels);
        return svg;
    },

    _appendColorBarTo: function (svg) {
        const colorPerValue = this._getColorPerValue();
        const w = this.options.width / colorPerValue.length;

        let groupBars = svg.append('g').attr('id', 'colorBar-buckets');
        let buckets = groupBars
            .selectAll('rect')
            .data(colorPerValue)
            .enter()
            .append('rect');
        buckets
            .attr('x', (d, i) => i * w + this.options.margin)
            .attr('y', () => 0)
            .attr('height', () => this.options.height /*w * 4*/)
            .attr('width', () => w)
            .attr('stroke-width', 2)
            .attr('stroke-linecap', 'butt')
            .attr('stroke', d => d.color.hex())
            .attr('fill', d => d.color.hex());
        buckets
            .append('title')
            .text(
                d =>
                    `${this.unit.value().conversion(d.value).toFixed(this.unit.value().precision)} ${this.unit.value().label
                        }`
            );
    },

    _appendLabelsTo: function (svg) {
        const positionPerLabelValue = this._getPositionPerLabelValue();
        //const w = this.options.width / colorPerValue.length;
        let groupLabels = svg.append('g').attr('id', 'colorBar-labels');
        let labels = groupLabels
            .selectAll('text')
            .data(positionPerLabelValue)
            .enter()
            .append('text');
        labels
            .attr('x', d => d.position + this.options.margin)
            .attr('y', this.options.height + this.options.margin)
            .attr('font-size', `${this.options.labelFontSize}px`)
            .attr('text-anchor', this.options.labelTextPosition)
            .attr('fill', this.options.textColor)
            .attr('class', 'leaflet-control-colorBar-label')
            .text(d => `${this.unit.value().conversion(d.value).toFixed(this.unit.value().precision)}`);
    },

    _getColorPerValue: function () {
        const [min, max] = this.range;
        let delta = (max - min) / this.options.steps;
        let data = d3.range(min, max + delta, delta);
        let colorPerValue = data.map(d => {
            return {
                value: d,
                color: this.color(d)
            };
        });
        return colorPerValue;
    },

    _getPositionPerLabelValue: function () {
        var xPositionFor = d3
            .scaleLinear()
            .range([0, this.options.width])
            .domain(this.range);
        let data = this.options.labels;
        let positionPerLabel = data.map(d => {
            return {
                value: d,
                position: xPositionFor(d)
            };
        });
        return positionPerLabel;
    },

    _createUnitToggle: function (id) {
        var units = this.options.units, size = units.length;
        var index = +(d3.select(id).attr('data-index') || 0) % size;
        return {
            value: function value() {
                return units[index];
            },
            next: function next() {
                d3.select(id).attr('data-index', index = (index + 1) % size);
            }
        };
    },

    _nextUnit: function () {
        this.unit.next();
        this.colorBar.innerHTML = this.title() + this.palette();
        if (this.options.cb) this.options.cb();
    },

    show: function () {
        this.colorBar.innerHTML = this.title() + this.palette();
    }

});

L.control.colorBar = function (color, range, options) {
    return new L.Control.ColorBar(color, range, options);
};
