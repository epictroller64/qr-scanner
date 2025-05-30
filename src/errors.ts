
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
export { CameraUIError, CameraError };