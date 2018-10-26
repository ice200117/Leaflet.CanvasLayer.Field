var fs = require('fs-extra');

var source = './dist/leaflet.canvaslayer.field.js';
var dest = '../hepp_front/static/leaflet.canvaslayer.field.js';
fs.copy(source, dest, function (err) {
    if (err) {
        return console.error(err);
    }
    console.log('Copied to ' + dest);
});

source = './dist/leaflet.canvaslayer.field.js.map';
dest = '../hepp_front/static/leaflet.canvaslayer.field.js.map';
fs.copy(source, dest, function (err) {
    if (err) {
        return console.error(err);
    }
    console.log('Copied to ' + dest);
});
