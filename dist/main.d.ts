export declare class png_sampler {
    private currChunkLength;
    private currChunkType;
    width: number;
    height: number;
    private bitDepth;
    private colorType;
    bytesPerPixel: number;
    bytesPerLine: number;
    private buffer;
    decompressedData: any;
    private compressedData;
    pixels: any;
    init_sampler(src: string): Promise<void>;
    filter_pixels(width: number, height: number): Uint8Array;
    private paethPredictor;
    print_info(): void;
    sample_pixel(x: number, y: number): [number, number, number, number];
}
export declare function sample_rectangle(x: number, y: number, width: number, height: number, img: string): Promise<void>;
