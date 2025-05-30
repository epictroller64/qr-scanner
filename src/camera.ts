import { CameraError } from "./errors";
import { ScannerAPI } from "./scannerApi";
import { CameraItem } from "./types";

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
    private scanAreaElement: HTMLDivElement | null = null;

    constructor(elementId: string) {
        this.parentElement = document.getElementById(elementId);
        if (!this.parentElement) {
            throw new CameraError("Parent element not found");
        }
        // Create container and vide element, make them public
        this.containerElement = this.createContainerElement();
        this.videoElement = this.createVideoElement();
        this.canvasElement = this.createCanvasElement();
        this.scannerApi = new ScannerAPI();
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

    createScanAreaElement() {
        this.throwIfNull(this.videoElement, "Video element not found");
        const scanOverlay = document.createElement("div");

        // Make the overlay cover the entire video element
        //TODO: Calculated corners based on the config and screen size
        scanOverlay.style.position = "absolute";
        scanOverlay.style.top = "0";
        scanOverlay.style.left = "0";
        scanOverlay.style.width = `${this.videoElement.videoWidth}px`;
        scanOverlay.style.height = `${this.videoElement.videoHeight}px`;
        scanOverlay.style.background = "transparent";
        scanOverlay.style.pointerEvents = "none";
        scanOverlay.style.display = "flex"


        const scanArea = document.createElement("div");
        scanArea.style.background = "transparent";
        scanArea.style.width = "300px";
        scanArea.style.height = "300px";
        scanArea.style.margin = "auto"
        scanArea.style.position = "relative"
        scanOverlay.appendChild(scanArea);

        const topLeft = document.createElement("div");
        topLeft.classList.add("top-left");
        topLeft.style.position = "absolute";
        topLeft.style.top = "0";
        topLeft.style.left = "0";
        topLeft.style.width = "50px";
        topLeft.style.height = "50px";
        topLeft.style.borderLeft = "2px solid white";
        topLeft.style.borderTop = "2px solid white";
        scanArea.appendChild(topLeft);

        const topRight = document.createElement("div");
        topRight.classList.add("top-right");
        topRight.style.position = "absolute";
        topRight.style.top = "0";
        topRight.style.right = "0";
        topRight.style.width = "50px";
        topRight.style.height = "50px";
        topRight.style.borderRight = "2px solid white";
        topRight.style.borderTop = "2px solid white";
        scanArea.appendChild(topRight);

        const bottomLeft = document.createElement("div");
        bottomLeft.classList.add("bottom-left");
        bottomLeft.style.position = "absolute";
        bottomLeft.style.bottom = "0";
        bottomLeft.style.left = "0";
        bottomLeft.style.width = "50px";
        bottomLeft.style.height = "50px";
        bottomLeft.style.borderLeft = "2px solid white";
        bottomLeft.style.borderBottom = "2px solid white";
        scanArea.appendChild(bottomLeft);

        const bottomRight = document.createElement("div");
        bottomRight.classList.add("bottom-right");
        bottomRight.style.position = "absolute";
        bottomRight.style.bottom = "0";
        bottomRight.style.right = "0";
        bottomRight.style.width = "50px";
        bottomRight.style.height = "50px";
        bottomRight.style.borderRight = "2px solid white";
        bottomRight.style.borderBottom = "2px solid white";
        scanArea.appendChild(bottomRight);
        this.throwIfNull(this.containerElement, "Container element not found");
        this.containerElement.appendChild(scanOverlay);
        this.scanAreaElement = scanOverlay;
        return scanArea;
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
            this.throwIfNull(this.videoElement, "Video element not found");
            this.canvasElement.width = this.videoElement.videoWidth;
            this.canvasElement.height = this.videoElement.videoHeight;
            this.createScanAreaElement();
            this.throwIfNull(this.scanAreaElement, "Scan area element not found");
            this.scanAreaElement.style.display = "flex";
        }
        this.videoElement.srcObject = stream;

        // Run the scanner API loop
        requestAnimationFrame(() => this.scanLoop());

        return stream;
    }

    scanLoop() {
        if (!this.isRunning) {
            return
        }
        this.throwIfNull(this.videoElement, "Video element not found");
        this.throwIfNull(this.canvasElement, "Canvas element not found");
        this.scannerApi.scanFrame(this.videoElement, this.canvasElement);
        requestAnimationFrame(() => this.scanLoop());
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