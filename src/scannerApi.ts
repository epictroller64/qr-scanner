import { readBarcodes, ReadResult, type ReaderOptions } from "zxing-wasm/reader";
import { ScannerAPIError } from "./errors";
import { Logger } from "./logger";

export class ScannerAPI {

    private logger: Logger;
    private readerOptions: ReaderOptions | undefined;
    private lastScanTime: number = 0;
    private frameRate: number = 10;
    private minInterval: number;

    constructor(readerOptions?: ReaderOptions, frameRate?: number) {
        this.logger = new Logger("ScannerAPI", true);
        this.readerOptions = readerOptions || this.createDefaultReaderOptions();
        this.frameRate = frameRate || 10;
        this.minInterval = 1000 / this.frameRate;
    }

    createDefaultReaderOptions(): ReaderOptions {
        return {}
    }

    private isScanAllowed(): boolean {
        const now = Date.now();
        return now - this.lastScanTime >= this.minInterval;
    }

    async scanImage(file: File): Promise<ReadResult[] | null> {
        const result = await readBarcodes(file, this.readerOptions);
        return result;
    }

    async scanFrame(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<ReadResult[] | null> {
        if (!videoElement || !canvasElement) {
            throw new ScannerAPIError("Video element or canvas element not found");
        }

        if (!this.isScanAllowed()) {
            return null;
        }

        if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
            const ctx = canvasElement.getContext("2d", {
                willReadFrequently: true
            });
            if (!ctx) {
                throw new ScannerAPIError("Could not get canvas context");
            }

            ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

            this.lastScanTime = Date.now();

            const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const result = await readBarcodes(imageData, this.readerOptions);
            return result;
        }
        return null;
    }

}

