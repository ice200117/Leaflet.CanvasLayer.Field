import Cell from '../Cell';

/**
 * ScalarField on canvas (a 'Raster')
 */
L.CanvasLayer.ScalarField = L.CanvasLayer.Field.extend({
    options: {
        type: 'colormap', // [colormap|vector]
        color: null, // function colorFor(value) [e.g. chromajs.scale],
        interpolate: false, // Change to use interpolation
        vectorSize: 20, // only used if 'vector'
        arrowDirection: 'from' // [from|towards]
    },

    initialize: function(scalarField, options) {
        L.CanvasLayer.Field.prototype.initialize.call(
            this,
            scalarField,
            options
        );
        L.Util.setOptions(this, options);
    },

    _defaultColorScale: function() {
        return chroma.scale(['white', 'black']).domain(this._field.range);
    },

    setColor(f) {
        this.options.color = f;
        this.needRedraw();
    },

    /* eslint-disable no-unused-vars */
    onDrawLayer: function(viewInfo) {
        if (!this.isVisible()) return;
        this._updateOpacity();

        let r = this._getRendererMethod();
        //console.time('onDrawLayer');
        r();
        //console.timeEnd('onDrawLayer');
    },
    /* eslint-enable no-unused-vars */

    _getRendererMethod: function() {
        switch (this.options.type) {
            case 'colormap':
                return this._drawImage.bind(this);
            case 'vector':
                return this._drawArrows.bind(this);
            default:
                throw Error(`Unkwown renderer type: ${this.options.type}`);
        }
    },

    _ensureColor: function() {
        if (this.options.color === null) {
            this.setColor(this._defaultColorScale());
        }
    },

    _showCanvas() {
        L.CanvasLayer.Field.prototype._showCanvas.call(this);
        this.needRedraw(); // TODO check spurious redraw (e.g. hide/show without moving map)
    },

    /**
     * Draws the field in an ImageData and applying it with putImageData.
     * Used as a reference: http://geoexamples.com/d3-raster-tools-docs/code_samples/raster-pixels-page.html
     */
    _drawImage: function() {
        this._ensureColor();

        let ctx = this._getDrawingContext();
        let width = this._canvas.width;
        let height = this._canvas.height;

        let img = ctx.createImageData(width, height);
        let data = img.data;

        this._prepareImageIn(data, width, height);
        ctx.putImageData(img, 0, 0);
    },

    deg2rad(deg) {
        return deg / 180 * Math.PI;
    },

    rad2deg(ang) {
        return ang / (Math.PI / 180.0);
    },

    _invert(x, y, windy) {
        var mapLonDelta = windy.east - windy.west;
        var worldMapRadius = windy.width / this.rad2deg(mapLonDelta) * 360 / (2 * Math.PI);
        var mapOffsetY = worldMapRadius / 2 * Math.log((1 + Math.sin(windy.south)) / (1 - Math.sin(windy.south)));
        var equatorY = windy.height + mapOffsetY;
        var a = (equatorY - y) / worldMapRadius;

        var lat = 180 / Math.PI * (2 * Math.atan(Math.exp(a)) - Math.PI / 2);
        var lon = this.rad2deg(windy.west) + x / windy.width * this.rad2deg(mapLonDelta);
        return {lng: lon, lat: lat};
    },

    /**
     * Prepares the image in data, as array with RGBAs
     * [R1, G1, B1, A1, R2, G2, B2, A2...]
     * @private
     * @param {[[Type]]} data   [[Description]]
     * @param {Numver} width
     * @param {Number} height
     */
    _prepareImageIn(data, width, height) {
        let f = this.options.interpolate ? 'interpolatedValueAt' : 'valueAt';
        // var bounds = this._map.getBounds();
        // var extent = [[bounds._southWest.lng, bounds._southWest.lat], [bounds._northEast.lng, bounds._northEast.lat]];
        // var windy = {
        //     south: this.deg2rad(extent[0][1]),
        //     north: this.deg2rad(extent[1][1]),
        //     east:  this.deg2rad(extent[1][0]),
        //     west:  this.deg2rad(extent[0][0]),
        //     width: width,
        //     height: height
        // };
        let pos = 0;
        let step = 2;     //  1 or 2
        for (let j = 0; j < height; j+=step) {
            for (let i = 0; i < width; i+=step) {
                let pointCoords = this._map.containerPointToLatLng([i, j]);
                let lon = pointCoords.lng;
                let lat = pointCoords.lat;

                let v = this._field[f](lon, lat); // 'valueAt' | 'interpolatedValueAt' || TODO check some 'artifacts'
                if (v !== null) {
                    let color = this._getColorFor(v);
                    let [R, G, B, A] = color.rgba();
                    data[pos] = R;
                    data[pos + 1] = G;
                    data[pos + 2] = B;
                    data[pos + 3] = parseInt(A * 255); // not percent in alpha but hex 0-255
                    if(step>1){
                        data[pos+4] = R;
                        data[pos+4 + 1] = G;
                        data[pos+4 + 2] = B;
                        data[pos+4 + 3] = parseInt(A * 255); // not percent in alpha but hex 0-255
                        data[pos+width*4] = R;
                        data[pos+width*4 + 1] = G;
                        data[pos+width*4 + 2] = B;
                        data[pos+width*4 + 3] = parseInt(A * 255); // not percent in alpha but hex 0-255
                        data[pos+width*4+4] = R;
                        data[pos+width*4+4 + 1] = G;
                        data[pos+width*4+4 + 2] = B;
                        data[pos+width*4+4 + 3] = parseInt(A * 255); // not percent in alpha but hex 0-255
                    }
                }
                pos = pos + 4*step;
            }
            let w = 0;
            if(width%2 !== 0) w = 1;
            pos = pos + (width-w)*(step-1)*4;
        }
    },

    /**
     * Draws the field as a set of arrows. Direction from 0 to 360 is assumed.
     */
    _drawArrows: function() {
        const bounds = this._pixelBounds();
        const pixelSize = (bounds.max.x - bounds.min.x) / this._field.nCols;

        var stride = Math.max(
            1,
            Math.floor(1.2 * this.options.vectorSize / pixelSize)
        );

        const ctx = this._getDrawingContext();
        ctx.strokeStyle = this.options.color;

        var currentBounds = this._map.getBounds();

        for (var y = 0; y < this._field.height; y = y + stride) {
            for (var x = 0; x < this._field.width; x = x + stride) {
                let [lon, lat] = this._field._lonLatAtIndexes(x, y);
                let v = this._field.valueAt(lon, lat);
                let center = L.latLng(lat, lon);
                if (v !== null && currentBounds.contains(center)) {
                    let cell = new Cell(
                        center,
                        v,
                        this.cellXSize,
                        this.cellYSize
                    );
                    this._drawArrow(cell, ctx);
                }
            }
        }
    },

    _pixelBounds: function() {
        const bounds = this.getBounds();
        const northWest = this._map.latLngToContainerPoint(
            bounds.getNorthWest()
        );
        const southEast = this._map.latLngToContainerPoint(
            bounds.getSouthEast()
        );
        var pixelBounds = L.bounds(northWest, southEast);
        return pixelBounds;
    },

    _drawArrow: function(cell, ctx) {
        var projected = this._map.latLngToContainerPoint(cell.center);

        // colormap vs. simple color
        let color = this.options.color;
        if (typeof color === 'function') {
            ctx.strokeStyle = color(cell.value);
        }

        const size = this.options.vectorSize;
        ctx.save();

        ctx.translate(projected.x, projected.y);

        let rotationRads = (90 + cell.value) * Math.PI / 180; // from, by default
        if (this.options.arrowDirection === 'towards') {
            rotationRads = rotationRads + Math.PI;
        }
        ctx.rotate(rotationRads);

        ctx.beginPath();
        ctx.moveTo(-size / 2, 0);
        ctx.lineTo(+size / 2, 0);
        ctx.moveTo(size * 0.25, -size * 0.25);
        ctx.lineTo(+size / 2, 0);
        ctx.lineTo(size * 0.25, size * 0.25);
        ctx.stroke();
        ctx.restore();
    },

    /**
     * Gets a chroma color for a pixel value, according to 'options.color'
     */
    _getColorFor(v) {
        // let c = this.options.color; // e.g. for a constant 'red'
        // if (typeof c === 'function') {
            // c = this.options.color(v);
        // }
        // let color = chroma(c); // to be more flexible, a chroma color object is always created || TODO improve efficiency
        return this.options.color(v);
    }
});

L.canvasLayer.scalarField = function(scalarField, options) {
    return new L.CanvasLayer.ScalarField(scalarField, options);
};
