# QR Code Scanner Library

A flexible and easy-to-use QR code scanning library that works in web browsers. Built with [zxing-wasm](https://github.com/Sec-ant/zxing-wasm) for reliable QR code detection.

## Features

- Real-time QR code scanning using device camera
- Image file scanning support
- Multiple camera selection
- Torch/flashlight control (when available)
- Customizable UI
- Configurable scan settings
- TypeScript support

## Dependencies

This library is built on top of [zxing-wasm](https://github.com/Sec-ant/zxing-wasm), which provides:
- High-performance barcode scanning using WebAssembly
- Support for multiple barcode formats
- Cross-platform compatibility (Web, Node.js, Bun, and Deno)
- TypeScript support

## Installation

### Option 1: Using GitHub Releases (Recommended)

1. Go to the [Releases](https://github.com/epictroller64/qr-scanner/releases) page
2. Download the latest release zip file
3. Extract the `dist` folder to your project
4. Import the library:
```javascript
import { BaseUI, Camera } from './path/to/dist/main.js';
```

### Option 2: Building from Source

1. Clone the repository:
```bash
git clone [repository-url]
cd qr-scanner
```

2. Install dependencies:
```bash
npm install
```

3. Build the library:
```bash
npm run build
```

4. Import the library in your project:
```javascript
import { BaseUI, Camera } from './dist/main.js';
```

## Usage

### Option 1: Using the Built-in UI

The simplest way to use the library is with the built-in UI:

```html
<div id="camera-mount"></div>
<script type="module">
    import { BaseUI } from './dist/main.js';
    
    window.addEventListener('DOMContentLoaded', async () => {
        const ui = new BaseUI("camera-mount");
        window.ui = ui;
    });
</script>
```

### Option 2: Custom Implementation

For more control, you can implement your own interface using the Camera API:

```html
<div id="camera-mount"></div>
<button id="start-scan">Start Scan</button>
<script type="module">
    import { Camera } from './dist/main.js';
    
    window.addEventListener('DOMContentLoaded', async () => {
        // Create camera with custom config
        const camera = new Camera({
            parentElementId: "camera-mount",
            logging: true,
            readerOptions: {
                formats: [
                    "QR_CODE",
                    "AZTEC",
                    "DATA_MATRIX",
                    "UPC_A",
                    "UPC_E",
                    "EAN_13",
                    "EAN_8",
                    "CODE_128",
                    "CODE_39",
                    "ITF",
                    "CODABAR",
                    "MSI",
                    "PLESSEY",
                    "IMB",
                    "PHARMACODE",
                    "PDF417"
                ]
            }
        }, {
            onStateChange: (state) => {
                console.log("State changed", state);
            },
            onScanSuccess: (result) => {
                console.log("Scan successful", result);
            },
            onScanFailure: (error) => {
                console.log("Scan failed", error);
            }
        });
        
        window.camera = camera;

        document.getElementById("start-scan").addEventListener("click", () => {
            camera.startScan();
        });
    });
</script>
```

## Configuration Options

### Camera Configuration

The Camera class accepts the following configuration options:

- `parentElementId`: ID of the HTML element where the camera view will be mounted
- `logging`: Enable/disable debug logging
- `readerOptions`: Configuration for the barcode reader
  - `formats`: Array of supported barcode formats

### Event Handlers

- `onStateChange`: Called when the camera state changes
- `onScanSuccess`: Called when a code is successfully scanned
- `onScanFailure`: Called when a scan attempt fails

## Browser Support

This library works in modern browsers that support:
- WebRTC
- MediaDevices API
- WebAssembly


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.