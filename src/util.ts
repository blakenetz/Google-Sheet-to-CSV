import { GoogleAuth } from "google-auth-library";
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

export interface EnvVariables {
  /**
   * Defined when creating Google Project
   * If not provided, it is extracted from `projectId`
   */
  projectName?: string;
  /**
   * Defined when creating Google Project
   */
  projectId: string;
  /**
   * Unique id of service account
   */
  clientId: string;
  /**
   * Credentials key id of service account
   */
  privateKeyId: string;
  /**
   * Credentials key of service account
   */
  privateKey: string;
}

export interface Store extends NonNullable<Options>, EnvVariables {}

export function cleanOptions(options: Options): Store {
  const appDir = path.dirname(require.main.filename);
  const keyFile =
    options.keyFile ?? path.resolve(appDir, "tokens", "credentials.json");
  const outputFile =
    options.outputFile ?? path.resolve(appDir, "assets", "output.csv");
  const verbose = options.verbose ?? false;

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
  const missing = Object.keys({
    GOOGLE_PRIVATE_KEY_ID,
    GOOGLE_PRIVATE_KEY,
    GOOGLE_CLIENT_ID,
  }).filter((key) => (!process.env[key] ? key : false));
  if (missing.length) {
    throw Error("Missing env secrets: " + missing.join(", "));
  }

  return {
    keyFile,
    outputFile,
    verbose,
    fileId: options.fileId,
    projectName,
    projectId: GOOGLE_PROJECT_ID,
    privateKeyId: GOOGLE_PRIVATE_KEY_ID,
    privateKey: GOOGLE_PRIVATE_KEY,
    clientId: GOOGLE_CLIENT_ID,
  };
}

/**
 * Ensure path exists and if not, creates required directories
 */
export function validateFilePath(filePath: string) {
  if (fs.existsSync(filePath)) return true;

  const parts = filePath.split(path.sep);
  // start on first index and work backwards
  for (let i = 1; i < parts.length - 1; i++) {
    console.log(parts[i]);
    const subPath = path.resolve(...parts.slice(0, i));
    if (!fs.existsSync(subPath)) fs.mkdirSync(subPath);
  }
}

export class GoogleSheetToCSV {
  store: Store;
  credentials: string;

  constructor(store: Store) {
    this.store = store;
    this.credentials = this.generateCredentialsJSON();
  }

  generateCredentialsJSON = () => {
    this.log("Looking for keyFile...");
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
  };

  authorize = async (): Promise<GoogleAuth<JSONClient>> => {
    const authScopes = ["https://www.googleapis.com/auth/drive"];

    this.log(`Authorizing...`);
    return new google.auth.GoogleAuth({
      keyFile: this.credentials,
      scopes: authScopes,
    });
  };

  /**
   * Downloads a file from drive
   * @see https://developers.google.com/drive/api/guides/manage-downloads
   **/
  fetchFile = async (client: GoogleAuth<JSONClient>) => {
    this.log(`Fetching file...`);

    google.options({ auth: client });
    const drive = google.drive({ version: "v3" });

    return drive.files.export({
      fileId: this.store.fileId,
      mimeType: "text/csv",
    }) as GaxiosPromise<string>;
  };

  writeFile = async (file: Awaited<GaxiosPromise<string>>) => {
    this.log(`Writing file to ${this.store.outputFile}...`);

    fsPromise.writeFile(this.store.outputFile, file.data, {
      encoding: "utf-8",
    });
  };

  log = (...msg: any[]) => {
    if (this.store.verbose) {
      console.log("🌞 ", ...msg);
    }
  };

  run = async () => {
    this.authorize()
      .then(this.fetchFile)
      .then(this.writeFile)
      .then(() => this.log(`Success!`));
  };
}
