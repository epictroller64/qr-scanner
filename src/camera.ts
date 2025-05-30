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
        if (!this.parentElement) {
            throw new CameraError("Parent element not found");
        }
        this.parentElement.appendChild(container);
        this.containerElement = container;
        return container;
    }

    createCanvasElement() {
        const canvas = document.createElement("canvas");
        canvas.classList.add("camera-canvas");
        if (!this.containerElement) {
            throw new CameraError("Container element not found");
        }
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
        if (!this.videoElement) {
            throw new CameraError("Video element not found");
        }
        let stream: MediaStream | null = this.videoElement.srcObject as MediaStream | null;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
            stream = null;
            this.isRunning = false;
        }
        if (!this.parentElement) {
            throw new CameraError("Parent element not found");
        }
        // Remove vide and container elements
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
        if (!this.videoElement) {
            throw new CameraError("Video element not found");
        }
        this.videoElement.onloadedmetadata = () => {
            if (!this.canvasElement) {
                throw new CameraError("Canvas element not found");
            }
            if (!this.videoElement) {
                throw new CameraError("Video element not found");
            }
            this.canvasElement.width = this.videoElement.videoWidth;
            this.canvasElement.height = this.videoElement.videoHeight;
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
        if (!this.videoElement) {
            throw new CameraError("Video element not found");
        }
        if (!this.canvasElement) {
            throw new CameraError("Canvas element not found");
        }
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
}