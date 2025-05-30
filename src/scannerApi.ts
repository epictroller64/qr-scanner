
import { readBarcodes, ReadResult } from "zxing-wasm/reader";
import { ScannerAPIError } from "./errors";
import { Logger } from "./logger";

export class ScannerAPI {

    private logger: Logger;

    constructor() {
        this.logger = new Logger("ScannerAPI", true);
    }

    async scanFrame(videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement): Promise<ReadResult[] | null> {
        if (!videoElement || !canvasElement) {
            throw new ScannerAPIError("Video element or canvas element not found");
        }
        if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
            const ctx = canvasElement.getContext("2d");
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

