

export class Logger {
    private name: string;
    private logging: boolean;
    constructor(name: string, logging: boolean = false) {
        this.name = name;
        this.logging = logging;
    }

    log(message: string) {
        if (this.logging) {
            console.log(`[${this.name}] ${message}`);
        }
    }

    error(message: string) {
        if (this.logging) {
            console.error(`[${this.name}] ${message}`);
        }
    }
}