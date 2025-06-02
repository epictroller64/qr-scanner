import { ReadResult } from "zxing-wasm/reader";
import { CameraError } from "./errors";
import { ScannerAPI } from "./scannerApi";
import { ScanOverlay } from "./scanOverlay";
import { CameraItem } from "./types";
import { Logger } from "./logger";

// Camera API
// Expose:
// - Start camera
// - Stop camera
// - Get cameras
// - Get camera permission
// - Get camera stream
// - Get camera video element
export class Camera {

    private permissionGranted: boolean = false;
    public videoElement: HTMLVideoElement | null = null;
    public isRunning: boolean = false;
    public containerElement: HTMLElement | null = null;
    public parentElement: HTMLElement | null = null;
    private canvasElement: HTMLCanvasElement | null = null;
    private scannerApi: ScannerAPI;
    private scanOverlay: ScanOverlay;
    private logger: Logger;

    constructor(elementId: string) {
        this.parentElement = document.getElementById(elementId);
        this.throwIfNull(this.parentElement, "Parent element not found");
        // Create container and vide element, make them public
        this.containerElement = this.createContainerElement();
        this.videoElement = this.createVideoElement();
        this.canvasElement = this.createCanvasElement();
        this.scannerApi = new ScannerAPI();
        this.scanOverlay = new ScanOverlay(this.videoElement, this.containerElement);
        this.logger = new Logger("Camera");
    }


    createContainerElement() {
        const container = document.createElement("div");
        container.classList.add("camera-container");
        this.throwIfNull(this.parentElement, "Parent element not found");
        this.parentElement.appendChild(container);
        this.containerElement = container;
        container.style.position = "relative";
        return container;
    }

    createCanvasElement() {
        const canvas = document.createElement("canvas");
        canvas.style.display = "none"
        canvas.classList.add("camera-canvas");
        this.throwIfNull(this.containerElement, "Container element not found");
        this.containerElement.appendChild(canvas);
        this.canvasElement = canvas;
        return canvas;
    }



    // Video element is created by API
    createVideoElement() {
        const video = document.createElement("video");
        video.classList.add("camera-video");
        video.autoplay = true;
        video.playsInline = true;
        video.style.position = "absolute";
        video.style.pointerEvents = "none";
        if (!this.containerElement) {
            throw new CameraError("Container element not found");
        }
        this.containerElement.appendChild(video);
        this.videoElement = video;
        return video;
    }

    async getCameraPermission() {
        const permission = await navigator.mediaDevices.getUserMedia({ video: true });
        if (!permission) {
            throw new CameraError("Camera permission not granted");
        }
        // Kill it instantly
        permission.getTracks().forEach(track => track.stop());
        this.permissionGranted = true;
    }

    async stopCamera() {
        this.throwIfNull(this.videoElement, "Video element not found");
        let stream: MediaStream | null = this.videoElement.srcObject as MediaStream | null;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
            stream = null;
            this.isRunning = false;
        }
        this.throwIfNull(this.parentElement, "Parent element not found");
    }

    clearCamera() {
        if (!this.parentElement) {
            throw new CameraError("Parent element not found");
        }
        this.parentElement.innerHTML = "";
        this.videoElement = null;
        this.containerElement = null;
    }

    async startCamera(cameraId: string) {
        if (!this.permissionGranted) {
            await this.getCameraPermission();
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: cameraId } } });
        this.isRunning = true;
        this.throwIfNull(this.videoElement, "Video element not found");
        this.videoElement.onloadedmetadata = () => {
            this.throwIfNull(this.canvasElement, "Canvas element not found");
            this.throwIfNull(this.containerElement, "Container element not found");
            this.throwIfNull(this.videoElement, "Video element not found");
            this.canvasElement.width = this.videoElement.videoWidth;
            this.canvasElement.height = this.videoElement.videoHeight;
            this.containerElement.style.width = `${this.videoElement.videoWidth}px`;
            this.containerElement.style.height = `${this.videoElement.videoHeight}px`;
            this.scanOverlay.createScanAreaElement();
            this.scanOverlay.toggleScanArea(true);
        }
        this.videoElement.srcObject = stream;

        // Run the scanner API loop
        requestAnimationFrame(() => this.scanLoop());

        return stream;
    }

    async scanLoop() {
        if (!this.isRunning) {
            return
        }
        this.throwIfNull(this.videoElement, "Video element not found");
        this.throwIfNull(this.canvasElement, "Canvas element not found");
        const result = await this.scannerApi.scanFrame(this.videoElement, this.canvasElement);
        if (result && result.length > 0) {
            console.log("Found something from the frame");
            // Found something from the frame
            this._onScanSuccess(result);
        }
        requestAnimationFrame(() => this.scanLoop());
    }
    // Callback function when scan finds a result
    onScanSuccess: (result: ReadResult[]) => void = () => { };
    onScanFailure: () => void = () => { };

    private _onScanSuccess(result: ReadResult[]) {
        // Paint the scan area green
        this.scanOverlay.onItemFound();
        this.onScanSuccess(result);
    }

    private _onScanFailure() {
        // WHen something goes wrong
        this.onScanFailure();
    }

    async getCameras(): Promise<CameraItem[]> {
        if (!this.permissionGranted) {
            await this.getCameraPermission();
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        console.log(devices);
        if (devices.length === 0) {
            throw new CameraError("No cameras found");
        }
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
}