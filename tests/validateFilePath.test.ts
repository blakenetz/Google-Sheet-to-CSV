import { validateFilePath } from "@/util";
import fs from "fs";

jest.mock("fs");

describe("validateFilePath", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("Should return true when filePath exists", () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(true);

    expect(validateFilePath("foo/bar")).toBeTruthy();
  });

  it("Should create directory when missing", () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);
    const spy = jest.spyOn(fs, "mkdirSync");

    validateFilePath("foo/bar/baz.tsx");

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
