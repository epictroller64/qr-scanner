import { ReaderOptions, ReadResult } from "zxing-wasm/reader";
import { Camera } from "./camera";
import { CameraState } from "./CameraState";
import { Logger } from "./logger";
import './styling/baseUi.css';
enum UIState {
    NEED_PERMISSION, // When camera permission is not granted
    CAMERA_RUNNING,
    STARTING, // When camera is starting up
    READY, // When camera has permission and is ready to scan
}


const viewMap = {
    [UIState.NEED_PERMISSION]: async (ui: BaseUI) => {
        const html = `
        <div>
            <h1>Need permission</h1>
            <p>Please grant camera permission to use this app</p>
            <button id="request-permission-button">Request permission</button>
        </div>
        `
        return html;
    },
    [UIState.CAMERA_RUNNING]: async (ui: BaseUI) => {
        return `
        <div>
            <h1>Camera running</h1>
            <p>Camera is running</p>
            <button id="stop-camera-button">Stop camera</button>
            <div id="log-box-container"></div>
        </div>
        `
    },
    [UIState.READY]: async (ui: BaseUI) => {
        return `
        <div>
            <h1>Ready</h1>
            <div id="camera-list-container"></div>
            <p>Camera is ready to scan</p>
            <button id="start-scanning-button">Start scanning</button>
        </div>
        `
    },
    [UIState.STARTING]: async (ui: BaseUI) => {
        const html = `
        <div>
            <h1>Starting</h1>
            <p>Starting camera...</p>
        </div>
        `
        return html;
    }
}

const uiHandlers = {
    startScanning: async (ui: BaseUI) => {
        if (!ui.selectedCameraId) {
            ui.selectedCameraId = (await ui.camera.getCameras())[0].deviceId;
        }
        ui.camera.start(ui.selectedCameraId);
        ui.setUiState(UIState.CAMERA_RUNNING);
    },
    stopScanning: async (ui: BaseUI) => {
        ui.camera.stop();
        ui.setUiState(UIState.READY);
    },
    requestPermission: async (ui: BaseUI) => {
        await ui.camera.requestCameraPermission();
        //Veriffy permission
        const permissionGranted = await ui.camera.getCameraPermission();
        if (permissionGranted) {
            ui.setUiState(UIState.READY);
        } else {
            ui.setUiState(UIState.NEED_PERMISSION);
        }
    }
}

// Sample UI class for giving the default options
export class BaseUI {
    private parentElementId: string;
    camera: Camera;
    private uiContainer: HTMLDivElement;
    selectedCameraId: string | null = null;
    private logger: Logger;
    private uiState: UIState = UIState.STARTING;
    private logBox: HTMLDivElement | null = null;

    constructor(parentElementId: string, readerOptions?: ReaderOptions) {
        this.logger = new Logger("BaseUI", true);
        this.parentElementId = parentElementId;
        // Bind the methods to preserve this context
        this.onCameraStateChange = this.onCameraStateChange.bind(this);
        this.onScanSuccess = this.onScanSuccess.bind(this);
        this.onScanFailure = this.onScanFailure.bind(this);

        this.camera = new Camera(parentElementId, {
            onStateChange: this.onCameraStateChange,
            onScanSuccess: this.onScanSuccess,
            onScanFailure: this.onScanFailure,
        }, readerOptions);
        this.uiContainer = this.createUiContainer();
        this.setUiState(UIState.STARTING, async () => {
            // Check permissions here
            const permission = await this.camera.getCameraPermission();
            if (permission) {
                this.setUiState(UIState.READY);
            } else {
                this.setUiState(UIState.NEED_PERMISSION);
            }
        });
        this.renderUi();
    }

    async renderUi() {
        this.uiContainer.innerHTML = await viewMap[this.uiState](this);
        this.attachEventListeners();
    }

    private attachEventListeners() {
        const requestPermissionButton = document.getElementById('request-permission-button');
        if (requestPermissionButton) {
            requestPermissionButton.addEventListener('click', () => uiHandlers.requestPermission(this));
        }

        const startScanningButton = document.getElementById('start-scanning-button');
        if (startScanningButton) {
            startScanningButton.addEventListener('click', () => uiHandlers.startScanning(this));
        }

        const stopCameraButton = document.getElementById('stop-camera-button');
        if (stopCameraButton) {
            stopCameraButton.addEventListener('click', () => uiHandlers.stopScanning(this));
        }

        // Add camera list if we're in READY state
        if (this.uiState === UIState.READY) {
            this.createCameraList().then(cameraList => {
                const container = document.getElementById('camera-list-container');
                if (container) {
                    container.appendChild(cameraList);
                }
            });
        }

        if (this.uiState === UIState.CAMERA_RUNNING) {
            this.createLogBox().then(logBox => {
                const container = document.getElementById('log-box-container');
                if (container) {
                    this.logBox = logBox;
                    container.appendChild(logBox);
                }
            });
        }
    }

    logging = {
        log: (message: string) => {
            if (this.logBox) {
                this.logBox.appendChild(document.createElement("p")).textContent = message;
            }
        },
        clear: () => {
            if (this.logBox) {
                this.logBox.innerHTML = "";
            }
        }
    }

    setUiState(uiState: UIState, callback?: () => void) {
        this.uiState = uiState;
        this.renderUi();
        if (callback) {
            callback();
        }
    }

    getParentContainerOrThrow() {
        const parentContainer = document.getElementById(this.parentElementId);
        if (!parentContainer) {
            this.logger.error("Parent container not found");
            throw new Error("Parent container not found");
        }
        return parentContainer;
    }

    createUiContainer() {
        const uiContainer = document.createElement("div");
        uiContainer.id = "ui-container";
        this.getParentContainerOrThrow().appendChild(uiContainer);
        this.logger.log("Ui container created");
        this.onCameraStateChange(this.camera.cameraState);
        return uiContainer;
    }

    onScanSuccess(result: ReadResult[]) {
        this.logger.log(`Scan success: ${result}`);
    }

    onScanFailure() {
        this.logger.log(`Scan failure`);
    }

    async onCameraStateChange(state: CameraState) {
        this.logger.log(`Camera state changed to ${state}`);
        if (state === CameraState.STARTING) {
            // Show loading indicator
        } else if (state === CameraState.SCANNING) {
            // Show stop button
        } else if (state === CameraState.READY) {
            // Show start button, camera list
        }
        else if (state === CameraState.ERROR) {
            // Show some error message
        }
        else if (state === CameraState.INITIALIZING) {
            // not sure
        }
    }

    async createLogBox() {
        const logBoxContent = document.createElement("div");
        logBoxContent.id = "log-box-content";
        return logBoxContent;
    }

    async createReadyView() {
        const readyViewContainer = document.createElement("div");
        readyViewContainer.id = "ready-view-container";
        const startButton = document.createElement("button");
        startButton.id = "start-button";
        startButton.textContent = "Start";
        startButton.addEventListener("click", async () => {
            if (this.selectedCameraId) {
                this.camera.start(this.selectedCameraId);
            } else {
                // start default camera
                this.camera.start((await this.camera.getCameras())[0].deviceId);

            }
        })
        readyViewContainer.appendChild(startButton);
        readyViewContainer.appendChild(await this.createCameraList());
        return readyViewContainer;
    }

    async createCameraList() {
        const cameras = await this.camera.getCameras();
        const cameraListContainer = document.createElement("div");
        cameraListContainer.id = "camera-list-container";
        const cameraList = document.createElement("select");
        cameraList.id = "camera-list";
        cameras.forEach((camera) => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.textContent = camera.label;
            cameraList.appendChild(option);
        });

        cameraList.addEventListener("change", (event) => {
            console.log(`Camera list changed: ${event.target}`);
            if (event.target) {
                this.selectedCameraId = (event.target as HTMLSelectElement).value;
            }
        })
        cameraListContainer.appendChild(cameraList);

        return cameraListContainer;
    }
}


