import { Camera } from "./camera";
import { CameraUIError } from "./errors";
import { Logger } from "./logger";
import "./styling/baseUi.css"

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

// Built in Camera UI
export class CameraUI {

    private camera: Camera | null = null;
    private selectedCameraId: string | null = null;
    private elementId: string;
    private videoElement: HTMLVideoElement | null = null;
    private cameraListElement: HTMLElement | null = null;
    private controlsElement: HTMLElement | null = null;
    private logging: boolean = false;
    private logger: Logger;

    constructor(elementId: string, logging: boolean = false) {
        this.elementId = elementId;
        this.logging = logging;
        this.logger = new Logger("CameraUI", this.logging);
    }

    async buildUi() {
        this.camera = new Camera(this.elementId);
        await this.createCameraListElement();
        await this.createControlsElement();
    }

    async clear() {
        if (this.camera) {
            await this.camera.stopCamera();
            this.camera.clearCamera();
        }
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
            await this.camera.stopCamera();
            // Custom handlers for later
            handlers.onCameraStop();
        });
        controls.appendChild(startScanningButton);
        controls.appendChild(stopScanningButton);
        controls.classList.add("camera-controls");
        if (!this.camera || !this.camera.parentElement) {
            throw new CameraUIError("Container element not found");
        }
        this.camera.parentElement.appendChild(controls);
        this.controlsElement = controls;
    }


    async createCameraListElement() {
        if (!this.camera) {
            throw new CameraUIError("Camera not found");
        }
        const cameraList = await this.camera.getCameras();
        const cameraListContainer = document.createElement("div");
        const cameraListSelect = document.createElement("select");
        cameraListContainer.classList.add("camera-list");
        cameraListSelect.classList.add("camera-select");
        cameraList.forEach(camera => {
            const cameraItem = document.createElement("option");
            cameraItem.classList.add("camera-item");
            cameraItem.textContent = camera.label;
            cameraListSelect.appendChild(cameraItem);
        });
        if (!this.camera || !this.camera.parentElement) {
            throw new CameraUIError("Container element not found");
        }
        this.camera.parentElement.appendChild(cameraListContainer);
        cameraListContainer.appendChild(cameraListSelect);
        this.selectedCameraId = cameraList[0].deviceId; // For testing only
        return cameraListContainer;
    }

    async startCamera() {
        if (!this.camera) {
            throw new CameraUIError("Camera not found");
        }
        if (!this.selectedCameraId) {
            throw new CameraUIError("Selected camera id not found");
        }
        this.logger.log("Starting camera");
        await this.camera.startCamera(this.selectedCameraId);
    }

}