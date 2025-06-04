import { CameraError } from "./errors";
import { ScanOverlay } from "./ScannerOverlay";

// Build all the elements necessary for basic camera operation
export class CameraUI {

    public parentElement: HTMLElement | null = null;
    public containerElement: HTMLElement | null = null;
    public videoElement: HTMLVideoElement | null = null;
    public canvasElement: HTMLCanvasElement | null = null;
    public overlayManager: ScanOverlay | null = null;
    // Handles the creation of:
    // - Video element, Canvas element, Overlay element
    // 
    constructor(parentElementId: string) {
        this.parentElement = document.getElementById(parentElementId);
        this.throwIfNull(this.parentElement, "Parent element not found");
        this.createContainerElement();
        this.createVideoElement();
        this.createCanvasElement();
        this.createOverlayElement();
    }
    setContainerDimensions(width: number, height: number) {
        this.throwIfNull(this.containerElement, "Container element not found");
        this.containerElement.style.width = `${width}px`;
        this.containerElement.style.height = `${height}px`;
    }

    setVideoStream(stream: MediaStream) {
        this.throwIfNull(this.videoElement, "Video element not found");
        this.videoElement.srcObject = stream;
    }
    setCanvasDimensions(width: number, height: number) {
        this.throwIfNull(this.canvasElement, "Canvas element not found");
        this.canvasElement.width = width;
        this.canvasElement.height = height;
    }

    // Create the overlay elemento
    private createOverlayElement() {
        this.throwIfNull(this.videoElement, "Video element not found");
        this.throwIfNull(this.containerElement, "Container element not found");
        this.overlayManager = new ScanOverlay(this.videoElement, this.containerElement);
    }

    // This container will hold camera feed: video, canva, overlay elements
    private createContainerElement() {
        this.throwIfNull(this.parentElement, "Parent element not found");
        const container = document.createElement("div");
        container.id = "camera-container";
        this.parentElement.appendChild(container);
        this.containerElement = container;
        container.style.position = "relative";
        return container;
    }

    // This element is used to send frames to the scanner
    private createCanvasElement() {
        const canvas = document.createElement("canvas");
        canvas.style.display = "none"
        canvas.classList.add("camera-canvas");
        this.throwIfNull(this.containerElement, "Container element not found");
        this.containerElement.appendChild(canvas);
        this.canvasElement = canvas;
        return canvas;
    }



    // Video element to show the camera feed
    private createVideoElement() {
        if (!this.containerElement) {
            throw new CameraError("Container element not found");
        }
        const video = document.createElement("video");
        video.classList.add("camera-video");
        video.autoplay = true;
        video.playsInline = true;
        video.style.position = "absolute";
        video.style.pointerEvents = "none";

        this.containerElement.appendChild(video);
        this.videoElement = video;
        return video;
    }

    // Calculate the camera container dimensions based on the screen dimensions
    calculateCameraContainerDimensions() {
        const screenDimensions = this.getScreenDimensions();
        if (screenDimensions.width < 640) {
            // Mobile screen
            return {
                width: screenDimensions.width,
                height: screenDimensions.width * 3 / 4
            }
        } else {
            // Desktop screen
            return {
                width: screenDimensions.width * 0.7,
                height: screenDimensions.width * 0.7 * 3 / 4
            }
        }
    }
    // Get screen dimensions to calculate the camera container dimensions
    private getScreenDimensions() {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        return {
            width: screenWidth,
            height: screenHeight
        }
    }

    private throwIfNull<T>(value: T | null, message: string): asserts value is T {
        if (!value) {
            throw new CameraError(message);
        }
    }
}