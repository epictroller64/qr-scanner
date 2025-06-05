import { ReaderOptions } from "zxing-wasm/reader";

export interface CameraItem {
    deviceId: string;
    label: string;
}

export type ScannerConfig = {
    readerOptions?: ReaderOptions;
    frameRate?: number;
    parentElementId: string;
    logging?: boolean;
    customConstraints?: MediaTrackConstraints;
}