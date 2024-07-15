# PNG

library written in ts to sample pixels from common png formats <br/><br/>

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

``IEND`` holds no data, it just holds a checksum. <br/>

``IHDR``, ``IDAT``, ``IEND`` are the least you need, together with the magic number at the beginning.

<br/>

here is the standard

http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html#C.Summary-of-standard-chunks <br/><br/>

## example

here is an example of the format i wrote up in `paint` using `ImHex`. <br/>

for context, each two letters are two hex values, each represented by 4 bits. and together takeup 8 bits, a byte. <br/>

![image](https://github.com/user-attachments/assets/a1b5a600-a481-4d5c-b2d9-148ab1fb8655)
![image](https://github.com/user-attachments/assets/15c5f25d-b254-41e5-bcaa-a728c53a84cf)

