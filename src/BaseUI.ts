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
        <div class="state-container">
            <p>Please grant camera permission to use the QR code scanner</p>
            <button id="request-permission-button" class="primary-button">
                <span>Grant Permission</span>
            </button>
        </div>
        `
        return html;
    },
    [UIState.CAMERA_RUNNING]: async (ui: BaseUI) => {
        return `
        <div class="state-container">
            <p>Position the QR code within the frame</p>
            <button id="stop-camera-button" class="secondary-button">
                <span>Stop Camera</span>
            </button>
            <button id="enable-torch-button" class="secondary-button">
                <span>Enable Torch</span>
            </button>
        </div>
        `
    },
    [UIState.READY]: async (ui: BaseUI) => {
        const cameraList = await ui.camera.getCameras();
        return `
        <div class="state-container">
            <div class="camera-list-container">
                <label for="camera-list">Select Camera:</label>
                <select id="camera-list">
                    ${cameraList.map(camera => `<option value="${camera.deviceId}">${camera.label}</option>`).join('')}
                </select>
            </div>
            <div class="scan-options-container">
                <button id="start-scanning-button" class="primary-button">
                    <span>Start Camera</span>
                </button>
                <p>or</p>
                <button id="pick-file-manually-button" class="secondary-button">
                    <span>Upload Image</span>
                </button>
            </div>
        </div>
        `
    },
    [UIState.STARTING]: async (ui: BaseUI) => {
        const html = `
        <div class="state-container">
            <p>Setting up the scanner...</p>
            <div class="loading"></div>
        </div>
        `
        return html;
    }
}

// Handlers for the UI elements
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
    toggleTorch: async (ui: BaseUI) => {
        ui.camera.toggleTorch();
        // Update the button text
        const enableTorchButton = document.getElementById('enable-torch-button');
        if (enableTorchButton) {
            enableTorchButton.textContent = ui.camera.constraintManager.torchEnabled ? "Disable Torch" : "Enable Torch";
        }
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
    },
    pickFileManually: async (ui: BaseUI) => {
        // Open file picker
        // When file is picked, scan it automatically and show the loaded image 
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.onchange = async (event) => {
            const file = (event.target as HTMLInputElement).files?.[0];
            if (file) {
                const result = await ui.camera.scanImage(file);
                if (result) {
                    if (result.length > 0) {
                        ui.logboxLogging.log(`Scan result: ${result[0].toString()}`);
                    } else {
                        ui.logboxLogging.log(`Scan result: No result`);
                    }
                } else {
                    ui.logboxLogging.log(`Scan result: No result`);
                }
                // Show the loaded image
                const imageContainer = document.createElement("div");
                const buttonContainer = document.createElement("div");
                buttonContainer.style.position = "absolute";
                buttonContainer.style.top = "10px";
                buttonContainer.style.right = "10px";
                const closeButton = document.createElement("button");
                closeButton.textContent = "Close";
                closeButton.onclick = () => {
                    imageContainer.remove();
                }
                imageContainer.id = "image-container";
                const image = document.createElement("img");
                image.src = URL.createObjectURL(file);
                image.alt = "Loaded image";
                imageContainer.appendChild(buttonContainer);
                buttonContainer.appendChild(closeButton);
                if (ui.camera.ui.containerElement) {
                    ui.camera.ui.containerElement.appendChild(imageContainer);
                    imageContainer.appendChild(image);
                }
            }
        }
        fileInput.click();
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
        }, readerOptions, 14);
        this.uiContainer = this.createUiContainer();
        this.logBox = this.createLogBox();
        this.logboxLogging.log("BaseUI constructor complete");
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
        this.logboxLogging.log("Ui rendered");
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

        const pickFileManuallyButton = document.getElementById('pick-file-manually-button');
        if (pickFileManuallyButton) {
            pickFileManuallyButton.addEventListener('click', () => uiHandlers.pickFileManually(this));
        }

        const enableTorchButton = document.getElementById('enable-torch-button');
        if (enableTorchButton) {
            enableTorchButton.addEventListener('click', () => uiHandlers.toggleTorch(this));
        }

        if (this.uiState === UIState.READY) {
            // Add change handler to camera list
            const cameraList = document.getElementById('camera-list');
            if (cameraList) {
                cameraList.addEventListener('change', (event) => {
                    this.selectedCameraId = (event.target as HTMLSelectElement).value;
                });
            }
        }


        if (this.uiState === UIState.CAMERA_RUNNING) {
            this.logboxLogging.log("Camera started")
        }
    }

    logboxLogging = {
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
        const logBoxContainer = document.createElement("div");
        logBoxContainer.id = "log-box-container";
        uiContainer.appendChild(logBoxContainer);
        return uiContainer;
    }

    onScanSuccess(result: ReadResult[]) {
        this.logger.log(`Scan success: ${result.map(r => r.text).join(", ")}`);
        this.logboxLogging.log(`Scan success: ${result.map(r => r.text).join(", ")}`);
    }

    onScanFailure() {
        this.logger.log(`Scan failure`);
        this.logboxLogging.log(`Scan failure`);
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

    createLogBox() {
        this.logger.log("Creating log box");
        const logBoxContainer = document.createElement("div");
        logBoxContainer.id = "log-box-container";
        const logBoxContent = document.createElement("div");
        logBoxContent.id = "log-box-content";
        logBoxContainer.appendChild(logBoxContent);
        this.getParentContainerOrThrow().appendChild(logBoxContainer);
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
        return readyViewContainer;
    }

}


