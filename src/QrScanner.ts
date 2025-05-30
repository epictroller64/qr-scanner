import { CameraUI } from "./cameraUi";

export class QrScanner {

    private cameraUi: CameraUI;
    constructor() {

        this.cameraUi = new CameraUI("camera-mount", true);
    }

    async start() {

        await this.cameraUi.buildUi();
    }

    async clear() {
        if (this.cameraUi) {
            await this.cameraUi.clear();
        }
    }

}
