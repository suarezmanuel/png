const fs = require('fs').promises;
const fsSync = require('fs');
const { PNG } = require ('pngjs');
const zlib = require ('zlib');

class png_sampler {

  private currChunkLength : number = 0;
  private currChunkType : string = "";
  public width : number = 0;
  public height : number = 0;
  private bitDepth : number = 0;
  private colorType : number = 0;
  private bytesPerPixel : number = 0;
  private bytesPerLine : number = 0;
  private buffer : any;
  public decompressedData : any;
  private compressedData : any;

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
          console.log(`bytesPerLine: ${this.bytesPerLine}, width: ${this.width}, bytesPerPixel: ${this.bytesPerPixel}`);

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
            // console.log("Decompressed data length:", this.decompressedData.length);
            // console.log("Expected data length:", this.height * this.bytesPerLine);

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

  print_all () {

    console.log("chunk length", this.currChunkLength);
    console.log("chunk type",this.currChunkType);
    console.log("width",this.width);
    console.log("height",this.height);
    console.log("bit depth",this.bitDepth);
    console.log("color type",this.colorType);
    console.log("bytes per pixel",this.bytesPerPixel);
    console.log("bytes per line",this.bytesPerLine);

    // console.log("buffer", this.buffer);
    // console.log("compressed data", this.compressedData);
    // console.log("decompressed data",this.decompressedData);
  }

  sample_pixel(x: number, y: number): [number, number, number, number] {
    if (!this.decompressedData) { throw new Error('PNG not initialized or decompressed. Call init_sampler first'); }
    if (x >= this.width || y >= this.height || x < 0 || y < 0) {
        throw new Error("coordinate values out of range");
    }

    const lineStart = y * this.bytesPerLine;
    const pixelStart = lineStart + x * this.bytesPerPixel + 1; // +1 to skip filter type byte

    let r = this.decompressedData[pixelStart];
    let g = this.decompressedData[pixelStart + 1];
    let b = this.decompressedData[pixelStart + 2];
    let a = this.colorType == 6 ? this.decompressedData[pixelStart + 3] : 255;

    return [r, g, b, a];
  }

  sample_rectangle(x: number, y: number, width: number, height: number): Uint8Array {
    let pixels = new Uint8Array(width * height * 4);
    let prevLine = new Uint8Array(this.bytesPerLine);
    
    for (let j = 0; j < height; j++) {
        const lineStart = (y + j) * this.bytesPerLine;
        const filterType = this.decompressedData[lineStart];
        let currentLine = new Uint8Array(this.bytesPerLine);
        
        for (let i = 0; i < this.bytesPerLine - 1; i++) {
            const byte = this.decompressedData[lineStart + 1 + i];
            let filtered;
            
            switch (filterType) {
                case 0: // None
                    filtered = byte;
                    break;
                case 1: // Sub
                    filtered = byte + (i >= this.bytesPerPixel ? currentLine[i - this.bytesPerPixel] : 0);
                    break;
                case 2: // Up
                    filtered = byte + prevLine[i];
                    break;
                case 3: // Average
                    const left = i >= this.bytesPerPixel ? currentLine[i - this.bytesPerPixel] : 0;
                    filtered = byte + Math.floor((left + prevLine[i]) / 2);
                    break;
                case 4: // Paeth
                    const a = i >= this.bytesPerPixel ? currentLine[i - this.bytesPerPixel] : 0;
                    const b = prevLine[i];
                    const c = i >= this.bytesPerPixel ? prevLine[i - this.bytesPerPixel] : 0;
                    filtered = byte + this.paethPredictor(a, b, c);
                    break;
                default:
                    throw new Error(`Unknown filter type: ${filterType}`);
            }
            
            currentLine[i] = filtered & 0xFF;
        }
        
        for (let i = 0; i < width; i++) {
            const pixelStart = i * this.bytesPerPixel;
            const outIndex = (j * width + i) * 4;
            
            pixels[outIndex] = currentLine[pixelStart];
            pixels[outIndex + 1] = currentLine[pixelStart + 1];
            pixels[outIndex + 2] = currentLine[pixelStart + 2];
            pixels[outIndex + 3] = this.colorType == 6 ? currentLine[pixelStart + 3] : 255;
        }
        
        prevLine.set(currentLine);
    }
    
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
}


async function img_test() {
  const sampler = new png_sampler();
  await sampler.init_sampler('files/minecraft_0.png');
  sampler.print_all();

  const x = 0;
  const y = 0;
  const width = sampler.width;
  const height = sampler.height;

  console.time('Sampling');
  const sampled = sampler.sample_rectangle(x, y, width, height);
  console.timeEnd('Sampling');

  const img = new PNG({ width, height, filterType: -1 });
  console.log("Created PNG dimensions:", img.width, img.height);

  img.data = Buffer.from(sampled);

  console.time('Writing file');
  img.pack().pipe(fsSync.createWriteStream('./out/output.png'))
      .on('finish', () => {
          console.timeEnd('Writing file');
          console.log('PNG file written.');
      })
      .on('error', (error: any) => console.error('Error writing PNG:', error));
}


async function main () {

  const sampler = new png_sampler();
  // init_sampler is async
  // and we need it to finish for sampling
  await sampler.init_sampler('pixels-large.png');
  const pixel = sampler.sample_pixel(100,100);
  console.log('pixel value:', pixel);
}

// call main and spit any error into the console
// main().catch(console.error);

img_test().catch(console.error);