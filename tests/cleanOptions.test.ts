import { cleanOptions, Options } from "@/util";

describe("cleanOptions", () => {
  beforeEach(() => {
    process.env = {
      GOOGLE_PROJECT_NAME: "test-project",
      GOOGLE_PROJECT_ID: "test-project-123",
      GOOGLE_PRIVATE_KEY_ID: "private_key_id",
      GOOGLE_PRIVATE_KEY: "private_key\\nlinebreak",
      GOOGLE_CLIENT_ID: "client_id",
    };
  });

  it("should clean and return valid options", () => {
    const options: Options = {
      fileId: "some-file-id",
      keyFile: "test-keyfile.json",
      outputFile: "test-output.csv",
      verbose: true,
    };

    const store = cleanOptions(options);
    expect(store).toEqual({
      keyFile: "test-keyfile.json",
      outputFile: "test-output.csv",
      projectName: "test-project",
      showLogs: true,
      fileId: "some-file-id",
      projectId: "test-project-123",
      privateKeyId: "private_key_id",
      privateKey: "private_key\\nlinebreak",
      clientId: "client_id",
    });
  });

  it("should throw error if required environment variables are missing", () => {
    delete process.env.GOOGLE_PROJECT_NAME;
    delete process.env.GOOGLE_PROJECT_ID;

    const options: Options = {
      fileId: "some-file-id",
    };

    expect(() => cleanOptions(options)).toThrow(
      "GOOGLE_PROJECT_NAME or GOOGLE_PROJECT_ID env variable required."
    );
  });

  it("should throw error if any Google secrets are missing", () => {
    delete process.env.GOOGLE_PRIVATE_KEY_ID;

    const options: Options = {
      fileId: "some-file-id",
    };

    expect(() => cleanOptions(options)).toThrow(
      "Missing env secrets: GOOGLE_PRIVATE_KEY_ID"
    );
  });
});
