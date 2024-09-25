import { auth, GoogleAuth } from "google-auth-library";
import { google } from "googleapis";
import path from "path";
import fsPromise from "fs/promises";
import fs from "fs";
import { JSONClient } from "google-auth-library/build/src/auth/googleauth";
import { GaxiosPromise } from "googleapis/build/src/apis/drive";

import "dotenv/config";

export interface Options {
  /**
   * Filepath of the JSON file for service account credentials
   * Relative to root directory
   * If JSON file doesn't exist, it will be created.
   *
   * @see https://developers.google.com/workspace/guides/create-credentials#create_credentials_for_a_service_account
   * @default "<rootDir>/tokens/credentials.json"
   */
  keyFile?: string;

  /**
   * Filepath to the outputted CSV file
   * Relative to root directory
   *
   * @default "<rootDir>/assets/output.csv"
   */
  outputFile?: string;

  /**
   * ID of the Google Sheet file
   */
  fileId: string;

  /**
   * Whether to display logs or not
   * @default false
   */
  verbose?: boolean;
}

interface Store {
  keyFile: string;
  outputFile: string;
  projectName: string;
  showLogs: boolean;
  fileId: string;
  projectId: string;
  privateKeyId: string;
  privateKey: string;
  clientId: string;
}

function cleanOptions(options: Options): Store {
  const appDir = path.dirname(require.main.filename);
  const keyFile =
    options.keyFile ?? path.resolve(appDir, "tokens", "credentials.json");
  const outputFile =
    options.outputFile ?? path.resolve(appDir, "assets", "output.csv");
  const showLogs = options.verbose ?? false;

  const {
    GOOGLE_PROJECT_NAME,
    GOOGLE_PROJECT_ID,
    GOOGLE_PRIVATE_KEY_ID,
    GOOGLE_PRIVATE_KEY,
    GOOGLE_CLIENT_ID,
  } = process.env;

  if (!GOOGLE_PROJECT_NAME && !GOOGLE_PROJECT_ID) {
    throw Error(
      "GOOGLE_PROJECT_NAME or GOOGLE_PROJECT_ID env variable required. See docs for more details."
    );
  }

  // extract projectDetails from id
  const projectName = GOOGLE_PROJECT_NAME ?? GOOGLE_PROJECT_ID.split("-")[0];

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
  store: Store;
  credentials: string;

  constructor(store: Store) {
    this.store = store;
    this.credentials = this.generateCredentialsJSON();
  }

  private generateCredentialsJSON() {
    if (!fs.existsSync(this.store.keyFile)) {
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
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${this.store.projectName}%40${this.store.projectId}.iam.gserviceaccount.com`,
        universe_domain: "googleapis.com",
      };

      const data = JSON.stringify(credentials, null, 2);
      fs.writeFileSync(this.store.keyFile, data);
      this.log(`Successfully wrote keyFile to ${this.store.keyFile}`);
    }

    return this.store.keyFile;
  }

  private async authorize(): Promise<GoogleAuth<JSONClient>> {
    const authScopes = ["https://www.googleapis.com/auth/drive"];

    return new google.auth.GoogleAuth({
      keyFile: this.credentials,
      scopes: authScopes,
    });
  }

  /**
   * Downloads a file from drive
   * @see https://developers.google.com/drive/api/guides/manage-downloads
   **/
  private async fetchFile(client: GoogleAuth<JSONClient>) {
    google.options({ auth: client });
    const drive = google.drive({ version: "v3" });

    return drive.files.export({
      fileId: this.store.fileId,
      mimeType: "text/csv",
    }) as GaxiosPromise<string>;
  }

  private async writeFile(file: Awaited<GaxiosPromise<string>>) {
    fsPromise.writeFile(this.store.outputFile, file.data, {
      encoding: "utf-8",
    });
  }

  public log(...msg: any[]) {
    if (this.store.showLogs) {
      console.log("🌞 ", ...msg);
    }
  }

  public async run() {
    this.authorize().then(this.fetchFile).then(this.writeFile);
  }
}

export default function run(options: Options) {
  const store = cleanOptions(options);
  const instance = new GoogleSheetToCSV(store);

  try {
    instance.run();
  } catch (error) {
    instance.log("error!", error);
  }
}
