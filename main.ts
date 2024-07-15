const fs = require('fs').promises;
const { PNG } = require ('pngjs');

class png_sampler {

  private currChunkLength : number = 0;
  private currChunkType : string = "";
  private width : number = 0;
  private height : number = 0;
  private bitDepth : number = 0;
  private colorType : number = 0;
  private bytesPerPixel : number = 0;
  private bytesPerLine : number = 0;
  private buffer : any;
  private dataStart : number = 0;


  async init_sampler (src: string) : Promise<void> {

    // buffer is in base 10, 0 <= buffer[i] <= 255, thus buffer[i] represents a byte
    // fs.readFile is an asynchronous call
    try {

      this.buffer = await fs.readFile(src);
      // after file is loaded these next lines will execute

      // check PNG magic number
      // gets 8 double hex from buffer to str and compares the strings
      if (this.buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
        throw new Error('not a valid PNG file');
      }

      // skip the magic number
      let pos = 8;

      while (pos < this.buffer.length) {

        // read 32 value from a buffer at a given offset pos as unsigned
        this.currChunkLength = this.buffer.readUInt32BE(pos);
        // get the 4 bytes of header name
        this.currChunkType = this.buffer.toString('ascii', pos + 4, pos + 8);

        if (this.currChunkType === 'IHDR') {

          // set image info
          // width si from pos + 8 until pos + 122
          this.width = this.buffer.readUInt32BE(pos + 8);
          this.height = this.buffer.readUInt32BE(pos + 12);
          // read the single int directly
          this.bitDepth = this.buffer[pos + 16];
          this.colorType = this.buffer[pos + 17];

          // if colorType isn't rgb or rgba
          if (this.colorType !== 2 && this.colorType !== 6) {
            throw new Error('Unsupported color type');
          }

          // check rgb or rgba
          this.bytesPerPixel = this.colorType === 6 ? 4 : 3;
          // IDAT isn't pure data, it holds a byte for filter type of the line
          // at the start of the scan line, thats why the +1
          this.bytesPerLine = this.width * this.bytesPerPixel + 1;

        } else if (this.currChunkType === "IDAT") {
          // pos + 8 points directly at the first byte of data
          this.dataStart = pos + 8;
          return;
        }

        // skip header, data, and footer of current chunk
        pos += 12 + this.currChunkLength;
      }

      throw new Error('IDAT chunk not found');

    } catch (error) {

      console.error('Error initializing PNG sampler: ', error);
      throw error;
    }
  }


  sample_pixel(x: number, y: number): [number, number, number, number] {

    if (!this.buffer) { throw new Error('PNG not initialized. Call init_sampler first'); }
    if (x > this.width || y > this.height || x < 0 || y < 0) {
      throw new Error("coordinate values out of range");
    }

    // +1 is to skip the filter type byte at the start of the scanline
    const pixelStart = this.dataStart + (y * this.bytesPerLine) + (x * this.bytesPerPixel) + 1;

    const r = this.buffer[pixelStart];
    const g = this.buffer[pixelStart + 1];
    const b = this.buffer[pixelStart + 2];
    // check rgb or rgba
    const a = this.colorType === 6 ? this.buffer[pixelStart + 3] : 255;

    // return the pixel colors
    return [r, g, b, a];
  }

  sample_rectangle(x: number, y: number, width: number, height: number) {
    
    let pixels = [];

    for (let i=0; i < width; i++ ) {
      for (let j=0; j < height; j++ ) {
        pixels.push(this.sample_pixel(x+i, y+j));
      }
    }

    return pixels;
  }
}


async function img_test () {

  const sampler = new png_sampler();
  await sampler.init_sampler('minecraft_0.png');

  const x = 128;
  const y = 96;
  const width = 32;
  const height = 32;

  const sampled = sampler.sample_rectangle(x, y, width, height);
  const img = new PNG ({ width, height });

  for (let i=0; i < width; i++) {
    for (let j=0; j < height; j++) {

      // note that img is in bytes, thats why * 4
      const idx = (j*width + i) * 4;
      // note that sampled is in pixels (4 bytes each)
      const [r, g, b, a] = sampled[j*width + i];
      img.data[idx] = r;
      img.data[idx+1] = g;
      img.data[idx+2] = b;
      img.data[idx+3] = a;
    }
  }

  // create image out of sampled pixels
  const buffer = PNG.sync.write(img);
  await fs.writeFile('test.png', buffer);
  console.log('created test image test.png');
}


async function main () {

  const sampler = new png_sampler();
  // init_sampler is async
  // and we need it to finish for sampling
  await sampler.init_sampler('minecraft_0.png');
  const pixel = sampler.sample_pixel(100,100);
  console.log('pixel value:', pixel);
}

// call main and spit any error into the console
// main().catch(console.error);

img_test().catch(console.error);