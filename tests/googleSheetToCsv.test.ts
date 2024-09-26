import { GoogleSheetToCSV, Store } from "@/util";
import fs from "fs";
import fsPromise from "fs/promises";
import { google } from "googleapis";

jest.mock("fs");
jest.mock("fs/promises");
jest.mock("googleapis");

describe("GoogleSheetToCSV", () => {
  let store: Store;

  beforeEach(() => {
    store = {
      keyFile: "test-keyfile.json",
      outputFile: "test-output.csv",
      projectName: "test-project",
      showLogs: true,
      fileId: "some-file-id",
      projectId: "test-project-123",
      privateKeyId: "private_key_id",
      privateKey: "private_key\\nlinebreak",
      clientId: "client_id",
    };
  });

  it("should generate credentials JSON if keyFile doesn't exist", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");

    const googleSheetToCSV = new GoogleSheetToCSV(store);
    googleSheetToCSV.generateCredentialsJSON();

    expect(writeFileSyncSpy).toHaveBeenCalledWith(
      "test-keyfile.json",
      expect.stringContaining("service_account")
    );
  });

  it("should not generate credentials JSON if keyFile exists", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    const writeFileSyncSpy = jest.spyOn(fs, "writeFileSync");

    const googleSheetToCSV = new GoogleSheetToCSV(store);
    googleSheetToCSV.generateCredentialsJSON();

    expect(writeFileSyncSpy).not.toHaveBeenCalled();
  });

  it("should call Google API to fetch and write file", async () => {
    const mockAuth = { auth: jest.fn() };
    const mockDrive = {
      files: {
        export: jest.fn().mockResolvedValue({ data: "test-data" }),
      },
    };

    (google.auth.GoogleAuth as unknown as jest.Mock).mockReturnValue(mockAuth);
    (google.drive as jest.Mock).mockReturnValue(mockDrive);

    const googleSheetToCSV = new GoogleSheetToCSV(store);
    const writeFileSpy = jest.spyOn(fsPromise, "writeFile");

    await googleSheetToCSV.run();

    expect(mockDrive.files.export).toHaveBeenCalledWith({
      fileId: "some-file-id",
      mimeType: "text/csv",
    });
    expect(writeFileSpy).toHaveBeenCalledWith("test-output.csv", "test-data", {
      encoding: "utf-8",
    });
  });

  it("should log messages if verbose is true", () => {
    const consoleLogSpy = jest.spyOn(console, "log");

    const googleSheetToCSV = new GoogleSheetToCSV(store);
    googleSheetToCSV.log("Test log");

    expect(consoleLogSpy).toHaveBeenCalledWith("🌞 ", "Test log");
  });

  it("should not log messages if verbose is false", () => {
    store.showLogs = false;
    const consoleLogSpy = jest.spyOn(console, "log");

    const googleSheetToCSV = new GoogleSheetToCSV(store);
    googleSheetToCSV.log("Test log");

    expect(consoleLogSpy).not.toHaveBeenCalled();
  });
});
