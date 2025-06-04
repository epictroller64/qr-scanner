export class ConstraintManager {
    private constraints: MediaTrackConstraints = {};
    private mediaStream: MediaStream | null = null;
    torchEnabled = false;

    constructor() {
    }

    setMediaStream(mediaStream: MediaStream) {
        this.mediaStream = mediaStream;
    }
    // Apply custom constraints to the camera
    setConstraints(constraints: MediaTrackConstraints) {
        this.constraints = constraints;
    }

    toggleTorch() {
        this.torchEnabled = !this.torchEnabled;
        this.constraints.advanced = [{ torch: this.torchEnabled } as MediaTrackConstraintSet];
        this.applyConstraints();
    }

    // Apply the constraints to the camera
    applyConstraints() {
        if (!this.mediaStream) {
            throw new Error("Media stream not set");
        }
        const tracks = this.mediaStream.getTracks();
        tracks.forEach(track => track.applyConstraints(this.constraints));
    }
}

