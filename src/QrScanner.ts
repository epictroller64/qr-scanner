import { CameraUI } from "./cameraElement";

export class QrScanner {

    private cameraUi: CameraUI;
    constructor() {

        this.cameraUi = new CameraUI("camera-mount");
    }

    async start() {

        await this.cameraUi.buildUi();
    }

}
