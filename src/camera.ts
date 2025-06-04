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
    ui: CameraUI;
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
        this.setCameraState(CameraState.READY);
    }

    setCameraState(state: CameraState) {
        this.cameraState = state;
        this.handlers.onStateChange(state);
    }

    async start(cameraId: string) {
        this.setCameraState(CameraState.STARTING);
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
                const container = document.getElementById("camera-container");
                if (!container) {
                    throw new CameraError("Camera container not found");
                }
                const rect = container.getBoundingClientRect();
                const w = Math.round(rect.width);
                const h = Math.round(rect.height);
                console.log(`Screen dimensions: ${w} ${h}`);
                this.ui.setCanvasDimensions(w, h);
                this.throwIfNull(this.ui.canvasElement, "Canvas element not found");
                this.throwIfNull(this.ui.containerElement, "Container element not found");
                this.throwIfNull(this.ui.overlayManager, "Overlay manager not found");
                this.ui.setContainerDimensions(w, h);
                this.ui.overlayManager.createScanAreaElement(w, h);
                this.ui.overlayManager.toggleScanArea(true);
                this.setCameraState(CameraState.SCANNING);
                requestAnimationFrame(() => this.scanLoop());
            }
            this.ui.setVideoStream(stream);
            this.setCameraState(CameraState.READY);

            return stream;
        } catch (error) {
            if (error instanceof CameraError) {
                this.logger.error(error.message);
                throw error;
            }
            throw new CameraError("Error starting camera");
        }
    }

    async scanImage(file: File) {
        const result = await this.scannerApi.scanImage(file);
        return result;
    }

    async stop() {
        this.throwIfNull(this.ui.videoElement, "Video element not found");
        let stream: MediaStream | null = this.ui.videoElement.srcObject as MediaStream | null;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            this.ui.videoElement.srcObject = null;
            stream = null;
            this.setCameraState(CameraState.READY);
            this.ui.overlayManager?.toggleScanArea(false);
            this.ui.overlayManager = null
        }
        this.throwIfNull(this.ui.parentElement, "Parent element not found");
    }

    private async scanLoop() {
        if (this.cameraState !== CameraState.SCANNING) {
            this.logger.log("Scan loop stopped, state is not SCANNING");
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
        this.ui.overlayManager?.onItemFound();
    }
}