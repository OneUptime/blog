# How to Stream Large Files from S3 in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Node.js, Streaming

Description: Learn how to efficiently stream large files from S3 in Node.js using readable streams, range requests, piping to HTTP responses, and processing data on the fly.

---

Loading a 5 GB file into memory just to send it to a client is a terrible idea. Your Node.js process will crash or, at best, consume absurd amounts of RAM. The right approach is streaming - read chunks from S3 and pipe them somewhere (HTTP response, file system, transform pipeline) without buffering the entire file.

Let's look at the different streaming patterns you'll need.

## Basic Stream from S3

The AWS SDK v3 returns a readable stream from `GetObject`. You can pipe it anywhere.

```javascript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const s3 = new S3Client({ region: 'us-east-1' });

// Stream an S3 object to a local file
async function streamToFile(bucket, key, localPath) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);

  // response.Body is a ReadableStream
  const writeStream = createWriteStream(localPath);

  // Use pipeline for proper error handling and cleanup
  await pipeline(response.Body, writeStream);

  console.log(`Streamed ${key} to ${localPath}`);
}

streamToFile('my-bucket', 'large-file.zip', './downloaded.zip');
```

Always use `pipeline` instead of `.pipe()`. The `pipeline` function handles errors properly and cleans up streams when something goes wrong. With `.pipe()`, you can end up with zombie streams and memory leaks.

## Streaming to an HTTP Response

The most common pattern - stream an S3 object directly to an Express response.

```javascript
import express from 'express';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { pipeline } from 'stream/promises';

const app = express();
const s3 = new S3Client({ region: 'us-east-1' });

app.get('/files/:key', async (req, res) => {
  const key = decodeURIComponent(req.params.key);

  try {
    // Get metadata first to set response headers
    const headCommand = new HeadObjectCommand({
      Bucket: 'my-bucket',
      Key: key,
    });
    const metadata = await s3.send(headCommand);

    // Set response headers
    res.setHeader('Content-Type', metadata.ContentType || 'application/octet-stream');
    res.setHeader('Content-Length', metadata.ContentLength);
    res.setHeader('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`);

    // Stream the file body
    const getCommand = new GetObjectCommand({
      Bucket: 'my-bucket',
      Key: key,
    });
    const response = await s3.send(getCommand);

    await pipeline(response.Body, res);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      res.status(404).json({ error: 'File not found' });
    } else {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      }
    }
  }
});

app.listen(3000);
```

The key thing here is checking `res.headersSent` before sending an error response. If we've already started streaming data, we can't send a JSON error.

## Range Requests (Partial Downloads)

Support for range requests lets clients download specific byte ranges. This is essential for video streaming and resumable downloads.

```javascript
app.get('/stream/:key', async (req, res) => {
  const key = decodeURIComponent(req.params.key);

  try {
    // Get file size
    const headCommand = new HeadObjectCommand({
      Bucket: 'my-bucket',
      Key: key,
    });
    const metadata = await s3.send(headCommand);
    const fileSize = metadata.ContentLength;

    // Parse range header
    const range = req.headers.range;

    if (range) {
      // Handle range request
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const getCommand = new GetObjectCommand({
        Bucket: 'my-bucket',
        Key: key,
        Range: `bytes=${start}-${end}`,
      });
      const response = await s3.send(getCommand);

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': metadata.ContentType,
      });

      await pipeline(response.Body, res);
    } else {
      // Full file request
      const getCommand = new GetObjectCommand({
        Bucket: 'my-bucket',
        Key: key,
      });
      const response = await s3.send(getCommand);

      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': metadata.ContentType,
        'Accept-Ranges': 'bytes',
      });

      await pipeline(response.Body, res);
    }
  } catch (error) {
    console.error('Stream error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Stream failed' });
    }
  }
});
```

## Processing Streams with Transforms

Sometimes you need to process data as it streams through - like decompressing, parsing CSV, or transforming JSON.

Stream a gzipped CSV from S3 and process it line by line.

```javascript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createGunzip } from 'zlib';
import { pipeline, Transform } from 'stream';
import { promisify } from 'util';
import readline from 'readline';

const pipelineAsync = promisify(pipeline);
const s3 = new S3Client({ region: 'us-east-1' });

async function processGzippedCSV(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);

  // Decompress the gzip stream
  const gunzip = createGunzip();

  // Create a line reader
  const rl = readline.createInterface({
    input: response.Body.pipe(gunzip),
    crlfDelay: Infinity,
  });

  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;

    // Parse CSV line (simplified - use a proper CSV parser in production)
    const fields = line.split(',');

    // Process each row
    if (lineCount === 1) {
      console.log('Headers:', fields);
    } else {
      // Do something with the data
      // e.g., insert into database, transform, aggregate
    }

    if (lineCount % 100000 === 0) {
      console.log(`Processed ${lineCount} lines...`);
    }
  }

  console.log(`Total lines processed: ${lineCount}`);
}

processGzippedCSV('my-bucket', 'data/events.csv.gz');
```

## Streaming JSON Processing

For large JSON files, use a streaming JSON parser instead of loading the entire file.

```javascript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray.js';
import { pipeline } from 'stream/promises';
import { Transform } from 'stream';

const s3 = new S3Client({ region: 'us-east-1' });

async function processLargeJSON(bucket, key) {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(command);

  let processedCount = 0;

  // Create a transform that processes each array element
  const processor = new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      // chunk.value contains each array element
      const item = chunk.value;

      // Process the item (filter, transform, etc.)
      processedCount++;

      if (processedCount % 10000 === 0) {
        console.log(`Processed ${processedCount} items`);
      }

      callback();
    },
  });

  // Stream: S3 -> JSON parser -> Array streamer -> Processor
  await pipeline(
    response.Body,
    parser(),
    streamArray(),
    processor
  );

  console.log(`Done. Processed ${processedCount} items.`);
}
```

## Uploading Streams to S3

You can also stream data to S3 - useful for generating files on the fly.

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { PassThrough } from 'stream';

const s3 = new S3Client({ region: 'us-east-1' });

async function streamUpload(bucket, key) {
  // Create a passthrough stream we can write to
  const passThrough = new PassThrough();

  // Start the upload (it reads from the passthrough stream)
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucket,
      Key: key,
      Body: passThrough,
      ContentType: 'text/csv',
    },
  });

  // Write data to the stream
  passThrough.write('id,name,email\n');
  for (let i = 0; i < 1000000; i++) {
    passThrough.write(`${i},user${i},user${i}@example.com\n`);
  }
  passThrough.end();

  // Wait for upload to complete
  await upload.done();
  console.log('Upload complete');
}
```

## Memory Management Tips

Streaming is about keeping memory usage constant regardless of file size. Here are some tips.

1. **Never call `transformToString()` or `transformToByteArray()` on large files** - these load everything into memory.
2. **Use `pipeline` instead of `.pipe()`** for proper error handling and backpressure.
3. **Set highWaterMark** on streams to control buffer size.
4. **Monitor memory usage** in production to catch leaks early.

```javascript
// Monitor memory during streaming operations
function logMemory(label) {
  const used = process.memoryUsage();
  console.log(`[${label}] RSS: ${Math.round(used.rss / 1024 / 1024)}MB, ` +
    `Heap: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
}
```

For monitoring your Node.js application's memory and performance in production, use [OneUptime](https://oneuptime.com) to track memory usage, response times, and error rates across your streaming endpoints.

For the Python equivalent of these patterns, check out our guide on [using Boto3 to upload and download files from S3](https://oneuptime.com/blog/post/boto3-upload-download-files-s3/view).
