interface MediaTrackCapabilitiesWithTorch extends MediaTrackCapabilities {
    torch: boolean;
}
export class CapabilitiesManager {
    private mediaStream: MediaStream | null = null;

    constructor() {

    }

    setMediaStream(mediaStream: MediaStream) {
        this.mediaStream = mediaStream;
    }

    checkTorchCapability(): boolean {
        if (!this.mediaStream) {
            throw new Error("Media stream not set");
        }
        const tracks = this.mediaStream.getVideoTracks();

        const track = tracks[0];
        const capabilities = track.getCapabilities() as MediaTrackCapabilitiesWithTorch;
        const torchConstraint = capabilities.torch;
        return torchConstraint;
    }
}
