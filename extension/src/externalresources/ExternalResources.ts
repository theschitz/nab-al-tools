import * as fs from "fs";
import * as path from "path";
import Axios from "axios";

interface ExternalResourceInterface {
  name: string;
  uri: string;
  data: string | undefined;
  get(writeStream: fs.WriteStream): Promise<boolean>;
}

interface BlobContainerInterface {
  baseUrl: string;
  blobs: ExternalResource[];
  exportPath: string;
  sasToken: string;
  getBlobs(filter: string[] | undefined): void;
  addBlob(name: string, uri: string): void;
}

export class ExternalResource implements ExternalResourceInterface {
  uri: string;
  name: string;
  data: undefined;

  constructor(name: string, uri: string) {
    this.name = name;
    this.uri = uri;
  }

  public async get(writeStream: fs.WriteStream): Promise<boolean> {
    // ref. https://stackoverflow.com/a/61269447
    return Axios({
      url: this.url().href,
      method: "GET",
      responseType: "stream",
    }).then((response) => {
      //ensure that the user can call `then()` only when the file has
      //been downloaded entirely.

      return new Promise((resolve, reject) => {
        response.data.pipe(writeStream);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let error: any;
        writeStream.on("error", (err) => {
          error = err;
          writeStream.close();
          reject(err);
        });
        writeStream.on("close", () => {
          if (!error) {
            resolve(true);
          }
          //no need to call the reject here, as it will have been called in the
          //'error' stream;
        });
      });
    });
  }

  public url(): URL {
    return new URL(this.uri);
  }
}

export class BlobContainer implements BlobContainerInterface {
  baseUrl: string;
  blobs: ExternalResource[] = [];
  sasToken: string;
  exportPath: string;

  constructor(exportPath: string, baseUrl: string, sasToken: string) {
    this.baseUrl = baseUrl;
    this.exportPath = exportPath;
    this.sasToken = sasToken;
  }

  public async getBlobs(languageCodeFilter?: string[]): Promise<number> {
    if (!fs.existsSync(this.exportPath)) {
      throw new Error(`Directory does not exist: ${this.exportPath}`);
    }
    let blobs: ExternalResource[] = [];
    if (languageCodeFilter === undefined) {
      blobs = this.blobs;
    } else {
      languageCodeFilter.forEach((code) => {
        const blob = this.blobs.filter((b) => b.name.indexOf(code) >= 0)[0];
        if (blob) {
          blobs.push(blob);
        }
      });
    }
    let result = 0;
    for (const blob of blobs) {
      const writeStream = fs.createWriteStream(
        path.resolve(this.exportPath, blob.name),
        "utf8"
      );
      await blob.get(writeStream).catch((err) => {
        let errorMessage = `Error when downloading '${blob.name}'.`;
        if (
          err.message ===
          "getaddrinfo EAI_AGAIN nabaltools.file.core.windows.net"
        ) {
          errorMessage =
            "Could not resolve host name. Check your internet connection.";
        }
        fs.unlinkSync(writeStream.path);
        return Promise.reject(
          new Error(`${errorMessage} Error: ${err.message}`)
        );
      });
      result++;
    }
    return result;
  }

  public addBlob(name: string): void {
    const uri = this.url(name);
    this.blobs.push(new ExternalResource(name, uri.toString()));
  }

  public getBlobByName(name: string): ExternalResource {
    return this.blobs.filter((b) => b.name === name)[0];
  }

  public url(name: string): URL {
    return new URL(`${this.baseUrl}${name}?${this.sasToken}`);
  }
}
