
class CameraUIError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CameraUIError";
    }
}

class CameraError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "CameraError";
    }
}

class ScannerAPIError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ScannerAPIError";
    }
}
export { CameraUIError, CameraError, ScannerAPIError };