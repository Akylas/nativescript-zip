import * as fs from 'tns-core-modules/file-system';

export class Zip {
  public static unzipWithProgress(
    archive: string,
    destination: string,
    progressCallback: (progressPercent) => void,
    overwrite?: boolean,
    password?: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!fs.File.exists(archive)) {
        return reject(`File does not exist, invalid archive path: ${archive}`);
      }

      let worker;
      if ((<any>global).TNS_WEBPACK) {
        const WorkerScript = require('nativescript-worker-loader!./zip-worker-ios');
        worker = new WorkerScript();
      } else {
        worker = new Worker('./zip-worker-ios');
      }
      worker.postMessage(<ZipRequest>{
        action: 'unzip',
        archive,
        destination,
        overwrite,
        password
      });
      worker.onmessage = msg => {
        // console.log(`Received worker callback: ${JSON.stringify(msg)}`);
        if (msg.data.progress != undefined) {
          progressCallback(msg.data.progress);
        } else if (msg.data.result != undefined) {
          if (msg.data.result) {
            resolve();
          } else {
            reject(msg.data.err);
          }
        } else {
          reject('zip-worker-ios failed');
        }
      };
      worker.onerror = err => {
        console.log(
          `An unhandled error occurred in worker: ${err.filename}, line: ${
          err.lineno
          }`
        );
        reject(err.message);
      };
    });
  }

  public static unzip(
    archive: string,
    destination: string,
    overwrite?: boolean,
    password?: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        if (password || overwrite) {
          SSZipArchive.unzipFileAtPathToDestinationOverwritePasswordError(
            archive,
            destination,
            overwrite,
            password
          );
        } else {
          SSZipArchive.unzipFileAtPathToDestination(archive, destination);
        }
        resolve();
      } catch (ex) {
        reject(ex);
      }
    });
  }

  public static zip(options:{
    folderToArchive: string,
    destination: string,
    progressCallback?: (progressPercent) => void,
    password?: string,
    keepParentDirectory?: boolean
  }): Promise<any> {
    return new Promise((resolve, reject) => {
        try {

          let callback = options.progressCallback?(entry, unz_file_info, entryNumber:number, total:number) => {
            options.progressCallback(total);
          }:undefined;
          SSZipArchive.createZipFileAtPathWithContentsOfDirectoryKeepParentDirectoryWithPasswordAndProgressHandler(
            options.destination, options.folderToArchive, options.keepParentDirectory, null, callback as (p1: number, p2: number) => void);
          resolve();
        } catch (ex) {
          reject(ex);
        }
    });
  }
}
