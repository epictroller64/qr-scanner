import { readBarcodes, ReadResult, type ReaderOptions } from "zxing-wasm/reader";
import { ScannerAPIError } from "./errors";
import { Logger } from "./logger";

export class ScannerAPI {

    private logger: Logger;
    private readerOptions: ReaderOptions | undefined;

    constructor(readerOptions?: ReaderOptions) {
        this.logger = new Logger("ScannerAPI", true);
        this.readerOptions = readerOptions || this.createDefaultReaderOptions();
    }

    createDefaultReaderOptions(): ReaderOptions {
        return {
            formats: [
                "QRCode",
                "MicroQRCode",
            ],

        }
    }

    async scanImage(file: File): Promise<ReadResult[] | null> {
        const result = await readBarcodes(file, this.readerOptions);
        return result;
    }

    async scanFrame(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<ReadResult[] | null> {
        if (!videoElement || !canvasElement) {
            throw new ScannerAPIError("Video element or canvas element not found");
        }
        if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
            const ctx = canvasElement.getContext("2d", {
                willReadFrequently: true
            });
            if (!ctx) {
                throw new ScannerAPIError("Canvas context not found");
            }
            ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
            const imageData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
            const result = await readBarcodes(imageData)
            if (result.length > 0) {
                this.logger.log(`Found ${result.length} barcodes`);
            }
            return result;
        }
        return null;
    }

}

