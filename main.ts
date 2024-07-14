const fs = require('fs');

function sample_pixel(src: string, x: number, y: number): Promise<[number, number, number, number]> {
  return new Promise((resolve, reject) => {

    fs.readFile(src, (err: any, buffer: any) => {
      if (err) { reject(err); return; }

      // check PNG magic number
      // gets 8 double hex from buffer to str and compares the strings
      if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
        reject(new Error('not a valid PNG file'));
        return;
      }

      // find IHDR chunk
      let pos = 8;
      while (pos < buffer.length) {

        const chunkLength = buffer.readUInt32BE(pos);
        const chunkType = buffer.toString('ascii', pos + 4, pos + 8);

        if (chunkType === 'IHDR') {
          const width = buffer.readUInt32BE(pos + 8);
          const height = buffer.readUInt32BE(pos + 12);
          const bitDepth = buffer[pos + 16];
          const colorType = buffer[pos + 17];

          if (x >= width || y >= height) {
            reject(new Error('Coordinates out of bounds'));
            return;
          }

          // for simplicity, we only handle rgb (colorType 2) or rgba (colorType 6)
          if (colorType !== 2 && colorType !== 6) {
            reject(new Error('Unsupported color type'));
            return;
          }


          // find IDAT chunk
          pos += 12 + chunkLength;
          while (pos < buffer.length) {
            const dataChunkLength = buffer.readUInt32BE(pos);
            // get chunk type
            const dataChunkType = buffer.toString('ascii', pos + 4, pos + 8);

            if (dataChunkType === 'IDAT') {
              // were not handling compressed PNG files, or any other chunk
              // check rgb or rgba
              const bytesPerPixel = colorType === 6 ? 4 : 3;
              // scan line length
              const bytesPerLine = width * bytesPerPixel + 1; // +1 for the filter type byte
              // pos is right after chunk header info
              const pixelStart = pos + 8 + (y * bytesPerLine) + (x * bytesPerPixel) + 1;

              const r = buffer[pixelStart];
              const g = buffer[pixelStart + 1];
              const b = buffer[pixelStart + 2];
              // check rgb or rgba
              const a = colorType === 6 ? buffer[pixelStart + 3] : 255;

              resolve([r, g, b, a]);
              return;
            }

            pos += 12 + dataChunkLength;
          }

        pos += 12 + chunkLength;
      }

      reject(new Error('Pixel data not found'));
    });
  });
}

// Usage
sample_pixel('minecraft_0.png', 100, 100)
  .then(([r, g, b, a]) => {
    console.log(`Pixel value at (100, 100): R: ${r}, G: ${g}, B: ${b}, A: ${a}`);
  })
  .catch(error => console.error('Error:', error));