# PNG

library written in ts to sample pixels from common png formats <br/><br/>

## support

chunks supported: `IHDR`, `IDAT`, `IEND`

algorithms supported: scanline filtering algorithm
<br/><br/>

## compilation

if you want to try the test yourself, you can compile and run the project

to compile run:
1. install the initial libs if first run `npm i `.
2. compile the ts file, do `tsc` in the project's root folder.
3. run the compiled js file using `node src/main.js`.

some test images are in the `files/` folder, the output image will be in the `out` folder.

i'll soon enough make it a library that can be included in other projects
<br/><br/>

## usage

here is a use case example, of a function in the library this samples pixels for tests

```
async function sample_rectangle(x: number, y: number, width: number, height: number) {
  
  let sampler = new png_sampler();
  await sampler.init_sampler("files/minecraft_0.png");

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
```
<br/>

## what is a PNG?

for context,

a ``PNG`` file is made of chunks, a chunk is made up of a header, data, and a footer. <br/>
header is 8 bytes, 4 bytes for chunk length, 4 bytes for chunk type. <br/>
footer is 4 bytes of ``CRC32`` checksum <br/>

the first chunk in a ``PNG`` file is the ``IHDR`` chunk. <br/>
``IHDR`` holds header info about the image <br/>

``IHDR`` has fields
```
width, height 

depth - how many bits per channel, each pixel has channels. 

colorType - 0 is greyscale, 2 is RGB, 3 is palette, 4 is greyscale and alpha, 6 is RGBA. 

compression - 0 represents deflate / inflate, a lossless compression algorithm that uses LZ77 and huffman. 

filter - a filter method used before compression to make the compression more efficient 
         there are 5 filter methods. 

interlace - is the image loaded with interlace? format for faster image loading, but bigger IDAT size. 
```

next there may be the chunks ``sRGB``, ``pHYs``, ``PLTE``, ``tRNS``, ``IDAT``, ``IEND``, etc..<br/>

``IDAT`` holds the pixels themselves and scanlines, note that each scanline is preceeded by a filter byte used in the filter algorithm <br/>

there may be many `IDAT` chunks that together form the image's data.

``IEND`` holds no data, it just holds a header and footer. <br/>

``IHDR``, ``IDAT``, ``IEND`` are the least you need, together with the magic number at the beginning.

<br/>

here is the standard

http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html#C.Summary-of-standard-chunks <br/><br/>

## example

here is an example of the format i wrote up in `paint` using `ImHex`. <br/>

for context, each two letters are two hex values, each represented by 4 bits. and together takeup 8 bits, a byte. <br/>

![image](https://github.com/user-attachments/assets/a1b5a600-a481-4d5c-b2d9-148ab1fb8655)
![image](https://github.com/user-attachments/assets/15c5f25d-b254-41e5-bcaa-a728c53a84cf)

