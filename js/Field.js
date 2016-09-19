/**
 *  Abstract class for a set of values (Vector | Scalar) assigned to a regular 2D-grid (lon-lat)
 *  U & V values follow row-major order (left->right & top ->down)
 */
class Field {
    constructor(params) {
        if (new.target === Field) {
            throw new TypeError("Cannot construct Field instances directly (use VectorField or ScalarField)");
        }

        this.ncols = params["ncols"];
        this.nrows = params["nrows"];

        // ll = lower-left
        this.xllcorner = params["xllcorner"];
        this.yllcorner = params["yllcorner"];

        // ur = upper-right
        this.xurcorner = params["xllcorner"] + params["ncols"] * params["cellsize"];
        this.yurcorner = params["yllcorner"] + params["nrows"] * params["cellsize"];

        this.cellsize = params["cellsize"];

        this.grid = this._buildGrid(params); // <<
    }

    /**
     * Builds a grid with a value at each point (either Vector or Number)
     * Params must include the required input values, following
     * x-ascending & y-descending order (same as in ASCIIGrid)
     * @private
     * @param   {Object} params - with u & v values
     * @returns {Array.<Array.<Vector|Number>>} - grid[row][column]--> Vector|Number
     */
    _buildGrid(params) {
        throw new TypeError("Must be overriden");
    }

    /**
     * Number of cells in the grid (rows * cols)
     * @returns {Number}
     */
    numCells() {
        return this.nrows * this.ncols;
    }

    /**
     * A list with every point in the grid, including coordinates and associated value
     * @returns {Array} - grid values [lon, lat, value]
     */
    gridLonLatValue() {
        let lonslatsV = [];
        let lon = this.xllcorner;
        let lat = this.yllcorner;
        for (var j = 0; j < this.nrows; j++) {
            for (var i = 0; i < this.ncols; i++) {
                let v = this._valueAtIndexes(i, j); // <<< valueAt i,j (vector or scalar)
                lonslatsV.push([lon, lat, v]); // <<
                lon += this.cellsize;
            }
            lat += this.cellsize;
            lon = this.xllcorner;
        }
        return lonslatsV;
    }

    /**
     * Grid extent
     * @returns {Number[]} [xmin, ymin, xmax, ymax]
     */
    extent() {
        return [this.xllcorner, this.yllcorner, this.xurcorner, this.yurcorner];
    }

    /**
     * Returns whether or not the grid contains the point
     * @param   {Number} lon - longitude
     * @param   {Number} lat - latitude
     * @returns {Boolean}
     */
    contains(lon, lat) {
        return (lon >= this.xllcorner &&
            lon <= this.xurcorner &&
            lat >= this.yllcorner &&
            lat <= this.yurcorner);
    }

    /**
     * Returns if the grid doesn't contain the point
     * @param   {Number} lon - longitude
     * @param   {Number} lat - latitude
     * @returns {Boolean}
     */
    notContains(lon, lat) {
        return !this.contains(lon, lat);
    }

    /**
     * Interpolated value at lon-lat coordinates
     * @param   {Number} lon - longitude
     * @param   {Number} lat - latitude
     * @returns {Vector|Number} [u, v, magnitude]
     */
    valueAt(lon, lat) {
        if (this.notContains(lon, lat)) return null;
        return this._interpolate(lon, lat);
    }

    /**
     * Returns whether or not the grid has value at the point
     * @param   {Number} lon - longitude
     * @param   {Number} lat - latitude
     * @returns {Boolean}
     */
    hasValueAt(lon, lat) {
        return this.valueAt(lon, lat) !== null;
    }

    /**
     * Returns if the grid has no vector values at the point
     * @param   {Number} lon - longitude
     * @param   {Number} lat - latitude
     * @returns {Boolean}
     */
    notHasValuesAt(lon, lat) {
        return !this.hasValueAt(lon, lat);
    }

    /**
     * Gives a random position to 'o' inside the grid
     * @param {Object} [o] - an object (eg. a particle)
     * @returns {{x: Number, y: Number}} - object with x, y (lon, lat)
     */
    randomPosition(o = {}) {
        let i = _.random(0, this.ncols - 1);
        let j = _.random(0, this.nrows - 1);
        o.x = this._longitudeAtX(i);
        o.y = this._latitudeAtY(j);
        return o;
    }


    /**
     * Value for grid indexes
     * @param   {Number} i - column index (integer)
     * @param   {Number} j - row index (integer)
     * @returns {Vector|Number}
     */
    _valueAtIndexes(i, j) {
        return this.grid[j][i]; // <-- j,i !!
    }

    /**
     * Lon-Lat for grid indexes
     * @param   {Number} i - column index (integer)
     * @param   {Number} j - row index (integer)
     * @returns {Number[]} [lon, lat]
     */
    _lonLatAtIndexes(i, j) {
        let lon = this._longitudeAtX(i);
        let lat = this._latitudeAtY(j);

        return [lon, lat];
    }

    /**
     * Longitude for grid-index
     * @param   {Number} i - column index (integer)
     * @returns {Number} longitude at the center of the cell
     */
    _longitudeAtX(i) {
        let halfPixel = this.cellsize / 2.0;
        return this.xllcorner + halfPixel + (i * this.cellsize);
    }

    /**
     * Latitude for grid-index
     * @param   {Number} j - row index (integer)
     * @returns {Number} latitude at the center of the cell
     */
    _latitudeAtY(j) {
        let halfPixel = this.cellsize / 2.0;
        return this.yurcorner - halfPixel - (j * this.cellsize);
    }

    /**
     * Interpolated value at a point
     * @private
     * @param {Number} lon - longitude
     * @param {Number} lat - latitude
     * @returns {Vector|Number}
     */
    _interpolate(lon, lat) {
        throw new TypeError("Must be overriden");
    }

    /**
     * Is valid (not 'null' nor 'undefined')
     * @private
     * @param   {Object} x object
     * @returns {Boolean}
     */
    _isValid(x) {
        return (x !== null) && (x !== undefined);
    }
}