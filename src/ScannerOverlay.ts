import { Logger } from "./logger";


export class ScanOverlay {
    private videoElement: HTMLVideoElement;
    private containerElement: HTMLElement;
    private scanAreaElement: HTMLElement | null = null;
    private logger: Logger;
    private corners: { topLeft: HTMLElement, topRight: HTMLElement, bottomLeft: HTMLElement, bottomRight: HTMLElement } | null = null;

    constructor(videoElement: HTMLVideoElement, containerElement: HTMLElement) {
        this.videoElement = videoElement;
        this.containerElement = containerElement;
        this.logger = new Logger("ScanOverlay");
    }

    private throwIfNull<T>(value: T | null, message: string): asserts value is T {
        if (!value) {
            this.logger.error(message);
            throw new Error(message);
        }
    }

    // Call when an item is found
    // Paint the overlay green
    onItemFound(duration: number = 1000) {
        if (!this.scanAreaElement) {
            console.error("Scan area element is null");
            return;
        }
        this.throwIfNull(this.corners, "Corners not found");
        for (const corner of Object.values(this.corners)) {
            corner.style.borderColor = "green";
        }
        // Reset back to white after duration
        setTimeout(() => {
            if (this.scanAreaElement && this.corners) {
                console.log("Resetting scan area color");
                for (const corner of Object.values(this.corners)) {
                    corner.style.borderColor = "white";
                }
            }
        }, duration);
    }

    toggleScanArea(show: boolean) {
        this.throwIfNull(this.scanAreaElement, "Scan area element not found");
        this.scanAreaElement.style.display = show ? "flex" : "none";
    }

    createScanAreaElement(w: number, h: number) {
        this.throwIfNull(this.videoElement, "Video element not found");
        const scanOverlay = document.createElement("div");
        // Make the overlay cover the entire video element
        //TODO: Calculated corners based on the config and screen size
        scanOverlay.style.position = "absolute";
        scanOverlay.style.top = "0";
        scanOverlay.style.left = "0";
        scanOverlay.style.width = `${w}px`;
        scanOverlay.style.height = `${h}px`;
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

        this.corners = { topLeft, topRight, bottomLeft, bottomRight };
        this.throwIfNull(this.containerElement, "Container element not found");
        this.containerElement.appendChild(scanOverlay);
        this.scanAreaElement = scanOverlay;
        this.logger.log("Scan area element created");
    }
}