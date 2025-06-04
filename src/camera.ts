import { ReaderOptions, ReadResult } from "zxing-wasm/reader";
import { CameraState } from "./CameraState";
import { CameraError } from "./errors";
import { Logger } from "./logger";
import { CameraItem } from "./types";
import { CameraUI } from "./CameraUI";
import { ScannerAPI } from "./ScannerAPI";

export type CameraHandlers = {
    onScanSuccess: (result: ReadResult[]) => void;
    onScanFailure: () => void;
    onStateChange: (state: CameraState) => void;
}

export class Camera {

    private logger: Logger;
    private permissionGranted: boolean = false;
    cameraState: CameraState = CameraState.INITIALIZING;
    private ui: CameraUI;
    private scannerApi: ScannerAPI;

    handlers: CameraHandlers = {
        onScanSuccess: () => { },
        onScanFailure: () => { },
        onStateChange: () => { }
    }

    constructor(parentElementId: string, handlers: CameraHandlers, readerOptions?: ReaderOptions) {
        this.logger = new Logger("Camera", true);
        this.handlers = handlers;
        // Build the camera interface and attach it to the DOM
        this.ui = new CameraUI(parentElementId);
        this.scannerApi = new ScannerAPI(readerOptions);
        this.logger.log("Camera constructor complete");
        this.handlers.onStateChange(CameraState.READY);
    }

    async start(cameraId: string) {
        this.cameraState = CameraState.STARTING;
        // Verify camera permissions
        if (!(await this.getCameraPermission())) {
            this.logger.error("Camera permission not granted");
            throw new CameraError("Camera permission not granted");
        }
        // Get the camera
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: cameraId } } });
            this.throwIfNull(this.ui.videoElement, "Video element not found");
            this.ui.videoElement.onloadedmetadata = () => {
                this.throwIfNull(this.ui.videoElement, "Video element not found");
                /// Test setting fixed dimensions for video
                //this.ui.setCanvasDimensions(this.ui.videoElement.videoWidth, this.ui.videoElement.videoHeight);
                this.ui.setCanvasDimensions(640, 480);
                this.throwIfNull(this.ui.canvasElement, "Canvas element not found");
                this.throwIfNull(this.ui.containerElement, "Container element not found");
                this.throwIfNull(this.ui.overlayManager, "Overlay manager not found");
                //this.ui.setContainerDimensions(this.ui.videoElement.videoWidth, this.ui.videoElement.videoHeight);
                this.ui.setContainerDimensions(640, 480);
                this.ui.overlayManager.createScanAreaElement();
                this.ui.overlayManager.toggleScanArea(true);
            }
            this.ui.setVideoStream(stream);
            this.cameraState = CameraState.READY;

            // Run the scanner API loop
            requestAnimationFrame(() => this.scanLoop());

            return stream;
        } catch (error) {
            if (error instanceof CameraError) {
                this.logger.error(error.message);
                throw error;
            }
            throw new CameraError("Error starting camera");
        }
    }

    async stop() {
        this.throwIfNull(this.ui.videoElement, "Video element not found");
        let stream: MediaStream | null = this.ui.videoElement.srcObject as MediaStream | null;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            this.ui.videoElement.srcObject = null;
            stream = null;
            this.cameraState = CameraState.READY;
        }
        this.throwIfNull(this.ui.parentElement, "Parent element not found");
    }

    private async scanLoop() {
        if (this.cameraState !== CameraState.SCANNING) {
            return
        }
        this.throwIfNull(this.ui.videoElement, "Video element not found");
        this.throwIfNull(this.ui.canvasElement, "Canvas element not found");
        const result = await this.scannerApi.scanFrame(this.ui.videoElement, this.ui.canvasElement);
        if (result && result.length > 0) {
            console.log("Found something from the frame");
            // Found something from the frame
            this._onScanSuccess(result);
        }
        requestAnimationFrame(() => this.scanLoop());
    }

    async getCameraPermission(): Promise<boolean> {
        const status = await navigator.permissions.query({ name: "camera" as PermissionName });
        this.logger.log(`Queried camera permission: ${status.state}`);
        return status.state === "granted";
    }

    async requestCameraPermission() {
        const permission = await navigator.mediaDevices.getUserMedia({ video: true });
        // Kill it instantly
        permission.getTracks().forEach(track => track.stop());
        this.logger.log(`Requested camera permission`);
        return permission;
    }
    // Get all available cameras
    async getCameras(): Promise<CameraItem[]> {
        if (!(await this.getCameraPermission())) {
            // Or request it??
            throw new CameraError("Camera permission not granted");
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (devices.length === 0) {
            this.logger.error("No cameras found");
            throw new CameraError("No cameras found");
        }

        this.logger.log(`Cameras found: ${devices.length}`);
        // Filter out devices that are not video inputs
        return devices.filter(device => device.kind === "videoinput").map(device => ({
            deviceId: device.deviceId,
            groupId: device.groupId,
            label: device.label
        }));
    }

    private throwIfNull<T>(value: T | null, message: string): asserts value is T {
        if (!value) {
            throw new CameraError(message);
        }
    }

    private _onScanSuccess(result: ReadResult[]) {
        this.handlers.onScanSuccess(result);
    }
}