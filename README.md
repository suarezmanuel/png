# png

library written in ts to sample pixels from common png formats <br/>

chunk is made up of header, data, and footer. <br/>

chunk headers are 32 bits, vals from 0 to 255. <br/>
header is the form of: length, type. the type is made up of 4 numbers interpreted in ascii <br/>
i.e. 0,0,0,13 73,72,68,82, which is length 13 and type ``IHDR`` <br/>

the first chunk in a ``PNG`` file is the ``IHDR`` chunk. <br/>
``IHDR`` holds header info about the image <br/>

``IHDR`` data is of the form: <br/>
```(32 bit ints) 
width, height 
(8 bit ints) 

depth - how many bits per channel, each pixel has channels. 

colorType - 0 is greyscale, 2 is RGB, 3 is palette, 4 is greyscale and alpha, 6 is RGBA. 

compression - 0 represents deflate / inflate, a lossless compression algorithm that uses LZ77 and huffman. 

filter - a filter method used before compression to make the compression more efficient 
         there are 5 filter methods. 

interlace - is the image loaded with interlace? format for faster image loading, but bigger IDAT size. 
```

footer contains 4 bytes of ``CRC32`` checksum <br/>

next there are the chunks ``sRGB``, ``pHYs``, ``PLTE``, ``tRNS``, ``IDAT``, ``IEND`` <br/>

``IDAT`` holds the pixels themselves and scanlines <br/>

``IEND`` holds no data, it just holds a checksum. <br/>
<br/>

here is the standard <br/>
http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html#C.Summary-of-standard-chunks