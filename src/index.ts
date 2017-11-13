import { RedisClient, ClientOpts } from 'redis'
import { VideoProcessor } from './VideoProcessor'
import { Client } from './Client'
import * as PQueue from 'p-queue'

let ProcessOperation: (key: string) => PQueue.Task<any> = (key) => {
    return () => {

        let [uuid, user] = key.split(':')

        let downloadVideos = ['-1', '-2', '-3']
            .map((index) => { return uuid + index })
            .map((video) => { return Client.download(video) })

        return Promise.all(downloadVideos)
            .then(VideoProcessor.process)
            .then(Client.upload(uuid))
            .then(
                (result) => { client.publish('processedVideo', key) }, 
                (reason) => { client.publish('processingError', key) }
            )
    }
}

let fillQueue: () => void = () => {
    console.log('queue is empty')
    client.SMEMBERS('render', (err, reply) => {
        if (err) { console.error(err); return }
        reply.slice(null, 10)
            .map((uuid) => { return ProcessOperation(uuid) })
            .forEach((operation) => { queue.add(operation) })
    })
}

const queue = (() => {
    let queue = new PQueue({ concurrency: 1 })
    queue.onEmpty()
        .then(fillQueue)
    return queue
})()

let newVideoChannel = 'newVideo'
let processedChannel = 'processedVideo'
let errorChannel = 'processingError'

let params = {
    host: "localhost"
}

const client = new RedisClient(params)
const listener: RedisClient = (() => {
    let redis = new RedisClient(params)
    
    redis.subscribe(newVideoChannel)
    redis.subscribe(processedChannel)
    redis.subscribe(errorChannel)

    redis.on("message", (channel, message) => {
        console.log(channel + ' ' + message)

        switch (channel) {
            case (newVideoChannel):  queue.add(ProcessOperation(message)); break
            case (processedChannel): push(message, 'result'); break
            case (errorChannel):     push(message, 'error'); break
            default: break
        }
    })
    return redis
})()

let push: (message: string, toQueue: string) => Promise<string> = (message, queue) => {
    return new Promise((resolve, reject) => {
        client.sadd(queue, message,
            (error, reply) => {
                if (error) { reject(error) }
                else { resolve(reply.toString()) }
            })
    });
}