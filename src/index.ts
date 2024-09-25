import { cleanOptions, GoogleSheetToCSV, Options } from "./util";

export default function run(options: Options) {
  const store = cleanOptions(options);
  const instance = new GoogleSheetToCSV(store);

  try {
    instance.run();
  } catch (error) {
    instance.log("error!", error);
  }
}
