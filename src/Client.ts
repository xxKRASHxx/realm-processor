import * as AWS from 'aws-sdk'
import { Readable } from 'stream'
import * as fs from 'fs'
import { Buffer } from 'buffer';

var Config = require('./config');

AWS.config.update({
    accessKeyId: Config.accessKeyId,
    secretAccessKey: Config.secretAccessKey,
    region: Config.region
})

export class Client {

    static download: (uuid: string) => Promise<Buffer> = (uuid) => {

        let operation = new AWS.S3().getObject({
            Bucket: Config.bucket,
            Key: uuid + '.mov',
            ResponseContentEncoding: null
        })

        return operation.promise()
            .then(Client.parse())
    }

    static upload(uuid: string): (video) => Promise<any> {
        return (video) => {

            let operation = new AWS.S3().putObject({
                Bucket: Config.bucket,
                Key: uuid + '.mov',
                Body: video,
                ACL: 'public-read'
            })
            
            return operation.promise()
        }
    }

    private static parse(): (value: AWS.S3.GetObjectOutput & { $response: AWS.Response<AWS.S3.GetObjectOutput, AWS.AWSError> }) => Buffer | PromiseLike<Buffer> {
        return (response) => {
            return new Promise<Buffer>((resolve, reject) => {
                200 == response.$response.httpResponse.statusCode ?
                    resolve(response.Body as Buffer) :
                    reject(response.$response.httpResponse.statusMessage);
            });
        };
    }
}