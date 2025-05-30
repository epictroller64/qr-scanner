import { CameraError } from "./errors";
import { CameraItem } from "./types";



export class Camera {

    private permissionGranted: boolean = false;
    private videoElement: HTMLVideoElement;
    constructor(videoElement: HTMLVideoElement) {
        this.videoElement = videoElement;
    }

    createCamera(elementId: string) {
        // Create camera element onto given ID

    }

    buildCamera() {
        // Build camera HTML
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
        let stream: MediaStream | null = this.videoElement.srcObject as MediaStream | null;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            this.videoElement.srcObject = null;
            stream = null;
        }
    }

    async startCamera(cameraId: string) {
        if (!this.permissionGranted) {
            await this.getCameraPermission();
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: cameraId } } });
        return stream;
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