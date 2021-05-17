// TODO:Complete
import * as path from "path";
import * as fs from "fs";
import minimatch = require("minimatch");

export function findFiles(pattern: string, root: string): string[] {
  let fileList = getAllFiles(root);
  fileList = fileList.filter((file) =>
    minimatch(file, pattern, { matchBase: true, nocase: true })
  );
  return fileList.sort((a, b) => a.localeCompare(b));
}

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  fs.readdirSync(dir).forEach((file) => {
    fileList = fs.statSync(path.join(dir, file)).isDirectory()
      ? getAllFiles(path.join(dir, file), fileList)
      : fileList.concat(path.join(dir, file));
  });
  return fileList;
}

export function getFilename(fsPath: string): string {
  return path.basename(fsPath);
}
