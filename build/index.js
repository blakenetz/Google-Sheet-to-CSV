"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = run;
const googleapis_1 = require("googleapis");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
require("dotenv/config");
function cleanOptions(options) {
    var _a, _b, _c;
    const appDir = path_1.default.dirname(require.main.filename);
    const keyFile = (_a = options.keyFile) !== null && _a !== void 0 ? _a : path_1.default.resolve(appDir, "tokens", "credentials.json");
    const outputFile = (_b = options.outputFile) !== null && _b !== void 0 ? _b : path_1.default.resolve(appDir, "assets", "output.csv");
    const showLogs = (_c = options.verbose) !== null && _c !== void 0 ? _c : false;
    const { GOOGLE_PROJECT_NAME, GOOGLE_PROJECT_ID, GOOGLE_PRIVATE_KEY_ID, GOOGLE_PRIVATE_KEY, GOOGLE_CLIENT_ID, } = process.env;
    if (!GOOGLE_PROJECT_NAME && !GOOGLE_PROJECT_ID) {
        throw Error("GOOGLE_PROJECT_NAME or GOOGLE_PROJECT_ID env variable required. See docs for more details.");
    }
    // extract projectDetails from id
    const projectName = GOOGLE_PROJECT_NAME !== null && GOOGLE_PROJECT_NAME !== void 0 ? GOOGLE_PROJECT_NAME : GOOGLE_PROJECT_ID.split("-")[0];
    // ensure remaining env variables exist
    const missing = [
        GOOGLE_PRIVATE_KEY_ID,
        GOOGLE_PRIVATE_KEY,
        GOOGLE_CLIENT_ID,
    ].filter((v) => !Boolean(v));
    if (missing.length) {
        throw Error("Missing env secrets: " + missing.join(", "));
    }
    return {
        keyFile,
        outputFile,
        projectName,
        showLogs,
        fileId: options.fileId,
        projectId: GOOGLE_PROJECT_ID,
        privateKeyId: GOOGLE_PRIVATE_KEY_ID,
        privateKey: GOOGLE_PRIVATE_KEY,
        clientId: GOOGLE_CLIENT_ID,
    };
}
class GoogleSheetToCSV {
    constructor(store) {
        this.store = store;
        this.credentials = this.generateCredentialsJSON();
    }
    generateCredentialsJSON() {
        if (!fs_1.default.existsSync(this.store.keyFile)) {
            this.log("keyFile file doesn't exist. Regenerating from env path...");
            const credentials = {
                type: "service_account",
                project_id: this.store.projectId,
                private_key_id: this.store.privateKeyId,
                /**
                 * fix problem with linebreaks
                 * @see https://stackoverflow.com/a/74668003/5947967
                 */
                private_key: this.store.privateKey.replace(/\\n/gm, "\n"),
                client_email: `${this.store.projectName}@${this.store.projectId}.iam.gserviceaccount.com`,
                client_id: this.store.clientId,
                auth_uri: "https://accounts.google.com/o/oauth2/auth",
                token_uri: "https://oauth2.googleapis.com/token",
                auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
                client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${this.store.projectName}%40${this.store.projectId}.iam.gserviceaccount.com`,
                universe_domain: "googleapis.com",
            };
            const data = JSON.stringify(credentials, null, 2);
            fs_1.default.writeFileSync(this.store.keyFile, data);
            this.log(`Successfully wrote keyFile to ${this.store.keyFile}`);
        }
        return this.store.keyFile;
    }
    authorize() {
        return __awaiter(this, void 0, void 0, function* () {
            const authScopes = ["https://www.googleapis.com/auth/drive"];
            return new googleapis_1.google.auth.GoogleAuth({
                keyFile: this.credentials,
                scopes: authScopes,
            });
        });
    }
    /**
     * Downloads a file from drive
     * @see https://developers.google.com/drive/api/guides/manage-downloads
     **/
    fetchFile(client) {
        return __awaiter(this, void 0, void 0, function* () {
            googleapis_1.google.options({ auth: client });
            const drive = googleapis_1.google.drive({ version: "v3" });
            return drive.files.export({
                fileId: this.store.fileId,
                mimeType: "text/csv",
            });
        });
    }
    writeFile(file) {
        return __awaiter(this, void 0, void 0, function* () {
            promises_1.default.writeFile(this.store.outputFile, file.data, {
                encoding: "utf-8",
            });
        });
    }
    log(...msg) {
        if (this.store.showLogs) {
            console.log("🌞 ", ...msg);
        }
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            this.authorize().then(this.fetchFile).then(this.writeFile);
        });
    }
}
function run(options) {
    const store = cleanOptions(options);
    const instance = new GoogleSheetToCSV(store);
    try {
        instance.run();
    }
    catch (error) {
        instance.log("error!", error);
    }
}
