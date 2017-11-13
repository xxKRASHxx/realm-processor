import * as Ffmpeg from 'fluent-ffmpeg'
import { Writable } from 'stream'
import * as tmp from 'tmp'
import * as fs from 'fs'

export class VideoProcessor {

    static process: (videos: [Buffer, Buffer, Buffer]) => Promise<Buffer> = (videos) => {
        return new Promise((resolve, reject) => {
            tmp.dir({ unsafeCleanup: true }, (err, path, cleanup) => {

                if (err) { 
                    cleanup()
                    reject(err) 
                    return 
                }

                let resultFile = path + '/result.mov'

                videos
                    .map(VideoProcessor.copyToTempFolder(path))
                    .reduce((command, video) => { return command.addInput(video) }, Ffmpeg())
                    .mergeToFile(resultFile)
                    .on('error', (err) => { cleanup(); reject(err) })
                    .on('end', () => { 
                        try { resolve(VideoProcessor.readResult(resultFile)) }
                        catch (e) { reject(e) }   
                        cleanup()
                    })
            })
        })
    }

    /* helper methods */

    private static copyToTempFolder(path: string): (buffer: Buffer, index: number) => string {
        return (buffer, index) => {

            let file = path + '/' + index + '.mov'
            var fileDescriptor

            try { fileDescriptor = fs.openSync(file, 'w') }
            catch (e) { console.log(e) }
            if (!fileDescriptor) return null

            fs.writeSync(fileDescriptor, buffer)
            fs.closeSync(fileDescriptor)
            
            return file
        }
    }

    private static readResult(path: string): Buffer {

        let fileDescriptor = fs.openSync(path, 'r');
        let buffer = fs.readFileSync(path)
        fs.closeSync(fileDescriptor)

        return buffer
    }
}
