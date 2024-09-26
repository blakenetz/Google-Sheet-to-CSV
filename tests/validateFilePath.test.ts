import { validateFilePath } from "@/util";
import fs from "fs";

jest.mock("fs");

describe("validateFilePath", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const spy = jest.spyOn(fs, "mkdirSync");

  it("Should return true when filePath exists", () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(true);

    validateFilePath("foo/bar");

    expect(spy).not.toHaveBeenCalled();
  });

  it("Should create directory when missing", () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

    validateFilePath("foo/bar/baz.tsx");

    expect(spy).toHaveBeenCalledTimes(1);
  });
  it("Strips invalid paths", () => {
    (fs.existsSync as jest.Mock).mockReturnValueOnce(false);

    validateFilePath("/foo//bar/baz.tsx");

    expect(spy).toHaveBeenCalledTimes(1);
  });
});
