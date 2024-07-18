const fs = require('fs').promises;
const fsSync = require('fs');
const { PNG } = require ('pngjs');
const zlib = require ('zlib');

export class png_sampler {

  private currChunkLength : number = 0;
  private currChunkType : string = "";
  public width : number = 0;
  public height : number = 0;
  private bitDepth : number = 0;
  private colorType : number = 0;
  public bytesPerPixel : number = 0;
  public bytesPerLine : number = 0;
  private buffer : any;
  public decompressedData : any;
  private compressedData : any;
  // array of processed bytes
  public pixels : any;

  public async init_sampler (src: string) : Promise<void> {

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
          // width is from pos + 8 until pos + 122
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
          // console.log(`bytesPerLine: ${this.bytesPerLine}, width: ${this.width}, bytesPerPixel: ${this.bytesPerPixel}`);

        } else if (this.currChunkType === "IDAT") {
            
            this.compressedData = Buffer.alloc(0);
            // the data may be distributed over many IDAT chunks
            while (this.currChunkType === "IDAT") {

              // console.log("position", pos);
              this.compressedData = Buffer.concat([this.compressedData, this.buffer.slice(pos+8, pos+8+this.currChunkLength)]);
              pos += 12 + this.currChunkLength;

              // get next chunk
              this.currChunkLength = this.buffer.readUInt32BE(pos);
              this.currChunkType = this.buffer.toString('ascii', pos + 4, pos + 8);
            }

            this.decompressedData = zlib.inflateSync(this.compressedData);
            this.pixels = this.filter_pixels(this.width, this.height);
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

  // doesn't touch the first pixel in scanline line
  // processes all the next pixels in the scanline
  filter_pixels(width: number, height: number): Uint8Array {

    // array of bytes that conclude the image, to be final output
    let pixels = new Uint8Array(width * height * 4);
    // array of bytes that conclude a scanline, including the filter byte
    let prevLine = new Uint8Array(this.bytesPerLine);
    
    for (let j = 0; j < height; j++) {

      const lineStart = j * this.bytesPerLine;
      // at the start of each line we have the filter type
      const filterType = this.decompressedData[lineStart];
      // initialize an array of zeroes representing the line as unsinged ints
      let currentLine = new Uint8Array(this.bytesPerLine);
      
      // loop through the array
      for (let i = 0; i < this.bytesPerLine - 1; i++) {

        // from second line byte to first byte of next line
        const byte = this.decompressedData[lineStart + i + 1];
        // will be byte after transformation
        let filtered;
        
        switch (filterType) {

          case 0: // none
            console.log(0);
            filtered = byte;
            break;

          case 1: // sub
            // if after the first pixel, sum our byte with the previous byte
            filtered = byte + (i >= this.bytesPerPixel ? currentLine[i - this.bytesPerPixel] : 0);
            break;

          case 2: // up
            filtered = byte + prevLine[i];
            break;

          case 3: // average
            // if after the first pixel, get previous byte
            const left = i >= this.bytesPerPixel ? currentLine[i - this.bytesPerPixel] : 0;
            // add to the curr byte the average of the left and top bytes
            filtered = byte + Math.floor((left + prevLine[i]) / 2);
            break;

          case 4: // paeth
            // if after the first pixel, get the previous byte
            const a = i >= this.bytesPerPixel ? currentLine[i - this.bytesPerPixel] : 0;
            // b is the top byte
            const b = prevLine[i];
            // if after the first pixel, get the top left byte
            const c = i >= this.bytesPerPixel ? prevLine[i - this.bytesPerPixel] : 0;
            // sum curr byte with closest out of a,b,c to a+b-c
            filtered = byte + this.paethPredictor(a, b, c);
            break;

          default:
            throw new Error(`Unknown filter type: ${filterType}`);
        }
          
        // modulo 256
        currentLine[i] = filtered & 0xFF;
      }
      

      // go through scan line
      for (let i = 0; i < width; i++) {

        // get starting byte of curr pixel in line
        const pixelStart = i * this.bytesPerPixel;
        // get byte position of curr pixel in buffer
        const outIndex = (j * width + i) * 4;
        
        pixels[outIndex]     = currentLine[pixelStart];
        pixels[outIndex + 1] = currentLine[pixelStart + 1];
        pixels[outIndex + 2] = currentLine[pixelStart + 2];
        pixels[outIndex + 3] = this.colorType == 6 ? currentLine[pixelStart + 3] : 255;
      }
      
      // prevLine is currentLine, and currentLine will be redefined
      prevLine.set(currentLine);
    }
    
    // return processed pixels
    return pixels;
  }

  private paethPredictor(a: number, b: number, c: number): number {
      const p = a + b - c;
      const pa = Math.abs(p - a);
      const pb = Math.abs(p - b);
      const pc = Math.abs(p - c);
      if (pa <= pb && pa <= pc) return a;
      if (pb <= pc) return b;
      return c;
  }

  public print_info () {

    console.log("\n-----------PNG info-----------");
    console.log("img width", this.width);
    console.log("img height", this.height);
    console.log("bit depth", this.bitDepth);
    console.log("color type", this.colorType);
    console.log("bytes per pixel", this.bytesPerPixel);
    console.log("bytes per line", this.bytesPerLine);
    console.log("pixel bytes", this.pixels.length);
    console.log("img width", this.width);
    console.log("------------------------------\n");
  }

  public sample_pixel(x: number, y: number): [number, number, number, number] {

    if (!this.pixels) { throw new Error('PNG not initialized or decompressed. Call init_sampler first'); }
    if (x >= this.width || y >= this.height || x < 0 || y < 0) {
        throw new Error("coordinate values out of range");
    }

    const pixelStart = y * this.width * this.bytesPerPixel;
    return this.pixels.slice(pixelStart + x * this.bytesPerPixel, pixelStart + (x+1) * this.bytesPerPixel);
  }
}

// using PNG lib for testing output
function create_png (pixels: any, width: number, height: number, name: string) {
  
  const img = new PNG({ width, height});
  // creating png
  // const img = new PNG({ width, height, filterType: -1 });
  console.log("created PNG of dimensions:", img.width, img.height);
  console.log("Pixel data length:", pixels.length);

  img.data = pixels;

  console.time('writing file');
  // create the directory if it doesn't exist
  fsSync.mkdirSync("./out", { recursive: true });
  // write the pixels to the image
  img.pack().pipe(fsSync.createWriteStream('./out/' + name))
    .on('finish', () => {
      // time the time to write
      console.timeEnd('writing file');
      console.log('PNG file written.');
    })
    .on('error', (error: any) => console.error('error writing PNG:', error));
}

export async function sample_rectangle(x: number, y: number, width: number, height: number, img: string) {
  
  let sampler = new png_sampler();
  await sampler.init_sampler(img);

  // preallocate the pixels
  let sampledPixels = Buffer.alloc(width * height * sampler.bytesPerPixel);

  console.time("sampling pixels");
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {

      const pixel = sampler.sample_pixel(x + i, y + j);
      const offset = (j * width + i) * sampler.bytesPerPixel;
      sampledPixels.set(pixel, offset);
    }
  }
  console.timeEnd("sampling pixels");

  create_png(sampledPixels, width, height, "output.png");
}


// sample_rectangle(0, 0, 500, 500, "files/minecraft_0.png").catch(console.error);