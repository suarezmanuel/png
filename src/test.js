var PNGReader = require('png.js');
var fs = require('fs');
const { PNG } = require('pngjs');

fs.readFile("./files/minecraft_0.png", function(err, buffer) {
    if (err) throw err;

    var reader = new PNGReader(buffer);
    reader.parse(function(err2, png) {
        if (err2) throw err2;

        const width = png.getWidth();
        const height = png.getHeight();
        
        const img = new PNG({ width, height, filterType: -1 });
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {

                const pixel = png.getPixel(x, y);
                const idx = (width * y + x) * 4;

                img.data[idx]     = pixel[0]; // Red
                img.data[idx + 1] = pixel[1]; // Green
                img.data[idx + 2] = pixel[2]; // Blue
                img.data[idx + 3] = 255; // Alpha
            }
        }
        
        img.pack().pipe(fs.createWriteStream('output.png'))
        .on('finish', () => console.log('PNG file written.'))
        .on('error', (error) => console.error('Error writing PNG:', error));
    });
});