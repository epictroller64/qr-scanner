import { Camera } from "./camera";
import { CameraUIError } from "./errors";


const handlers = {
    onCameraStart: () => {
        console.log("Camera started");
    },
    onCameraStop: () => {
        console.log("Camera stopped");
    },
    onCameraError: (error: CameraUIError) => {
        console.error(error);
    }
}


export class CameraUI {

    private parentElement: HTMLElement;
    private containerElement: HTMLElement | null = null;
    private camera: Camera | null = null;
    private selectedCameraId: string | null = null;
    private videoElement: HTMLVideoElement | null = null;
    private cameraListElement: HTMLElement | null = null;
    private controlsElement: HTMLElement | null = null;

    constructor(elementId: string) {
        const parentElement = document.getElementById(elementId);
        if (!parentElement) {
            throw new CameraUIError("Parent element not found");
        }
        this.parentElement = parentElement;
    }

    async buildUi() {
        this.createContainer();
        this.createVideoElement();
        await this.createCameraListElement();
        await this.createControlsElement();
        if (!this.videoElement) {
            throw new CameraUIError("Video element not found");
        }
        if (!this.selectedCameraId) {
            throw new CameraUIError("Selected camera id not found");
        }
        if (!this.camera) {
            throw new CameraUIError("Camera not found");
        }
        const cameraStream = await this.camera.startCamera(this.selectedCameraId);
        this.videoElement.srcObject = cameraStream;
    }

    async createControlsElement() {
        const controls = document.createElement("div");
        const startScanningButton = document.createElement("button");
        startScanningButton.textContent = "Start Scanning";
        startScanningButton.addEventListener("click", async () => {
            if (!this.camera) {
                throw new CameraUIError("Camera not found");
            }
            if (!this.selectedCameraId) {
                throw new CameraUIError("Selected camera id not found");
            }
            await this.camera.startCamera(this.selectedCameraId);
            // Custom handlers for later
            handlers.onCameraStart();
        });
        const stopScanningButton = document.createElement("button");
        stopScanningButton.textContent = "Stop Scanning";
        stopScanningButton.addEventListener("click", async () => {
            if (!this.camera) {
                throw new CameraUIError("Camera not found");
            }
            if (!this.videoElement) {
                throw new CameraUIError("Video element not found");
            }
            await this.camera.stopCamera();
            this.videoElement.srcObject = null;
            this.videoElement.remove()
            this.camera = null;
            this.parentElement.innerHTML = ""
            this.containerElement = null;
            this.videoElement = null;
            this.cameraListElement = null;
            this.controlsElement = null;
            // Custom handlers for later
            handlers.onCameraStop();
        });
        controls.appendChild(startScanningButton);
        controls.appendChild(stopScanningButton);
        controls.classList.add("camera-controls");
        if (!this.containerElement) {
            throw new CameraUIError("Container element not found");
        }
        this.containerElement.appendChild(controls);
        this.controlsElement = controls;
    }

    createVideoElement() {
        if (!this.containerElement) {
            throw new CameraUIError("Container element not found");
        }
        const video = document.createElement("video");
        video.classList.add("camera-video");
        video.autoplay = true;
        video.playsInline = true;
        this.containerElement.appendChild(video);
        this.videoElement = video;
        this.camera = new Camera(video);
    }

    async createCameraListElement() {
        if (!this.containerElement) {
            throw new CameraUIError("Container element not found");
        }
        if (!this.camera) {
            throw new CameraUIError("Camera not found");
        }
        const cameraList = await this.camera.getCameras();
        const cameraListElement = document.createElement("div");
        cameraListElement.classList.add("camera-list");
        cameraList.forEach(camera => {
            const cameraItem = document.createElement("div");
            cameraItem.classList.add("camera-item");
            cameraItem.textContent = camera.label;
            cameraListElement.appendChild(cameraItem);
        });
        this.containerElement.appendChild(cameraListElement);
        this.selectedCameraId = cameraList[0].deviceId; // For testing only
        return cameraListElement;
    }

    createContainer() {
        const container = document.createElement("div");
        container.classList.add("camera-container");
        this.parentElement.appendChild(container);
        this.containerElement = container;
    }

}