"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const fs = require('fs').promises;
const fsSync = require('fs');
const { PNG } = require('pngjs');
const zlib = require('zlib');
class png_sampler {
    constructor() {
        this.currChunkLength = 0;
        this.currChunkType = "";
        this.width = 0;
        this.height = 0;
        this.bitDepth = 0;
        this.colorType = 0;
        this.bytesPerPixel = 0;
        this.bytesPerLine = 0;
    }
    init_sampler(src) {
        return __awaiter(this, void 0, void 0, function* () {
            // buffer is in base 10, 0 <= buffer[i] <= 255, thus buffer[i] represents a byte
            // fs.readFile is an asynchronous call
            try {
                this.buffer = yield fs.readFile(src);
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
                    }
                    else if (this.currChunkType === "IDAT") {
                        this.compressedData = Buffer.alloc(0);
                        // the data may be distributed over many IDAT chunks
                        while (this.currChunkType === "IDAT") {
                            // console.log("position", pos);
                            this.compressedData = Buffer.concat([this.compressedData, this.buffer.slice(pos + 8, pos + 8 + this.currChunkLength)]);
                            pos += 12 + this.currChunkLength;
                            // get next chunk
                            this.currChunkLength = this.buffer.readUInt32BE(pos);
                            this.currChunkType = this.buffer.toString('ascii', pos + 4, pos + 8);
                        }
                        this.decompressedData = zlib.inflateSync(this.compressedData);
                        this.pixels = this.filter_pixels(this.width, this.height);
                        // console.log("Decompressed data length:", this.decompressedData.length);
                        // console.log("Expected data length:", this.height * this.bytesPerLine);
                        return;
                    }
                    // skip header, data, and footer of current chunk
                    pos += 12 + this.currChunkLength;
                }
                throw new Error('IDAT chunk not found');
            }
            catch (error) {
                console.error('Error initializing PNG sampler: ', error);
                throw error;
            }
        });
    }
    print_all() {
        console.log("chunk length", this.currChunkLength);
        console.log("chunk type", this.currChunkType);
        console.log("width", this.width);
        console.log("height", this.height);
        console.log("bit depth", this.bitDepth);
        console.log("color type", this.colorType);
        console.log("bytes per pixel", this.bytesPerPixel);
        console.log("bytes per line", this.bytesPerLine);
        // console.log("buffer", this.buffer);
        // console.log("compressed data", this.compressedData);
        // console.log("decompressed data",this.decompressedData);
    }
    sample_pixel(x, y) {
        if (!this.pixels) {
            throw new Error('PNG not initialized or decompressed. Call init_sampler first');
        }
        if (x >= this.width || y >= this.height || x < 0 || y < 0) {
            throw new Error("coordinate values out of range");
        }
        const pixelStart = y * this.bytesPerLine + x * this.bytesPerPixel;
        let r = this.pixels[pixelStart];
        let g = this.pixels[pixelStart + 1];
        let b = this.pixels[pixelStart + 2];
        let a = this.colorType == 6 ? this.pixels[pixelStart + 3] : 255;
        return [r, g, b, a];
    }
    // just doesn't touch the first byte in the line
    filter_pixels(width, height) {
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
                    case 0: // None
                        console.log(0);
                        filtered = byte;
                        break;
                    case 1: // Sub
                        // if after the first pixel, sum our byte with the previous byte
                        filtered = byte + (i >= this.bytesPerPixel ? currentLine[i - this.bytesPerPixel] : 0);
                        break;
                    case 2: // Up
                        filtered = byte + prevLine[i];
                        break;
                    case 3: // Average
                        // if after the first pixel, get previous byte
                        const left = i >= this.bytesPerPixel ? currentLine[i - this.bytesPerPixel] : 0;
                        // add to the curr byte the average of the left and top bytes
                        filtered = byte + Math.floor((left + prevLine[i]) / 2);
                        break;
                    case 4: // Paeth
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
                pixels[outIndex] = currentLine[pixelStart];
                pixels[outIndex + 1] = currentLine[pixelStart + 1];
                pixels[outIndex + 2] = currentLine[pixelStart + 2];
                pixels[outIndex + 3] = this.colorType == 6 ? currentLine[pixelStart + 3] : 255;
            }
            // prevLine is currentLine, and currentLine will be redefined
            prevLine.set(currentLine);
        }
        // return adorned pixels
        return pixels;
    }
    paethPredictor(a, b, c) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        if (pa <= pb && pa <= pc)
            return a;
        if (pb <= pc)
            return b;
        return c;
    }
}
function img_test() {
    return __awaiter(this, void 0, void 0, function* () {
        const sampler = new png_sampler();
        yield sampler.init_sampler('files/minecraft_0.png');
        sampler.print_all();
        const x = 0;
        const y = 0;
        const width = sampler.width;
        const height = sampler.height;
        // timing the sampling of the bytes in the rectangle
        console.time('Sampling');
        // sampled pixels after filtering
        const sampled = sampler.pixels;
        console.timeEnd('Sampling');
        // creating png
        const img = new PNG({ width, height, filterType: -1 });
        console.log("Created PNG dimensions:", img.width, img.height);
        img.data = Buffer.from(sampled);
        console.time('Writing file');
        img.pack().pipe(fsSync.createWriteStream('./out/output.png'))
            .on('finish', () => {
            // time the time to write
            console.timeEnd('Writing file');
            console.log('PNG file written.');
        })
            .on('error', (error) => console.error('Error writing PNG:', error));
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const sampler = new png_sampler();
        // init_sampler is async
        // and we need it to finish for sampling
        yield sampler.init_sampler('pixels-large.png');
        const pixel = sampler.sample_pixel(100, 100);
        console.log('pixel value:', pixel);
    });
}
// call main and spit any error into the console
// main().catch(console.error);
img_test().catch(console.error);
