# How to Use Lambda Response Streaming for Large Payloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, Serverless, Performance

Description: Learn how to use AWS Lambda response streaming to send large payloads incrementally, reduce time-to-first-byte, and overcome the 6MB response limit.

---

Lambda's traditional request-response model has a hard 6MB limit on response payloads. If you need to send more than that, you're stuck - or at least you were until response streaming came along. With streaming, your function can send data incrementally as it generates it, pushing the limit up to 20MB and dramatically reducing time-to-first-byte for large responses.

## What Response Streaming Actually Does

In the standard model, Lambda buffers your entire response in memory, then sends it all at once after your function finishes. With streaming, data flows to the client as you write it. Your function can start sending bytes within milliseconds of invocation, even if the full response takes seconds to generate.

This matters for several use cases: serving large files, generating reports, streaming AI model outputs, or building server-sent events for real-time UIs.

## Setting Up a Streaming Function

Response streaming requires the Node.js runtime and a function URL. It doesn't work through API Gateway - that's a key limitation to understand upfront.

Here's the basic structure of a streaming Lambda function:

```javascript
// The handler signature is different for streaming functions
// You get a responseStream object to write to
export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    // Set the content type
    const metadata = {
      statusCode: 200,
      headers: {
        "Content-Type": "text/plain",
      },
    };

    // Wrap the stream with metadata
    responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

    // Write data incrementally
    responseStream.write("Starting report generation...\n");

    for (let i = 0; i < 100; i++) {
      const chunk = await generateReportSection(i);
      responseStream.write(chunk);
    }

    // Always end the stream
    responseStream.end();
  }
);
```

The `awslambda.streamifyResponse` wrapper tells Lambda you want streaming behavior. The `responseStream` object is a Node.js writable stream, so it works with all the standard stream APIs.

## Creating the Function URL

You need a Lambda function URL configured for streaming. Here's how to set that up with CloudFormation.

This CloudFormation template creates a streaming function with a public URL:

```yaml
Resources:
  StreamingFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: my-streaming-function
      Runtime: nodejs20.x
      Handler: index.handler
      Code:
        S3Bucket: my-deployment-bucket
        S3Key: streaming-function.zip
      MemorySize: 512
      Timeout: 300

  FunctionUrl:
    Type: AWS::Lambda::Url
    Properties:
      TargetFunctionArn: !Ref StreamingFunction
      AuthType: AWS_IAM  # Or NONE for public access
      InvokeMode: RESPONSE_STREAM  # This enables streaming

  FunctionUrlPermission:
    Type: AWS::Lambda::Permission
    Properties:
      FunctionName: !Ref StreamingFunction
      Action: lambda:InvokeFunctionUrl
      Principal: "*"
      FunctionUrlAuthType: NONE
```

The critical setting is `InvokeMode: RESPONSE_STREAM`. Without it, the function URL operates in buffered mode and you won't get streaming behavior.

## Streaming CSV Reports

One of the most practical uses for response streaming is generating large CSV files. Instead of building the entire file in memory, you stream rows as you query them from a database.

This function streams a CSV report by querying DynamoDB in pages:

```javascript
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const dynamodb = new DynamoDBClient({});

export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    const metadata = {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=report.csv",
      },
    };

    responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

    // Write CSV header
    responseStream.write("id,name,email,created_at,status\n");

    let lastKey = undefined;
    let rowCount = 0;

    // Paginate through all items
    do {
      const result = await dynamodb.send(
        new ScanCommand({
          TableName: "Users",
          ExclusiveStartKey: lastKey,
          Limit: 100,
        })
      );

      // Stream each row as we get it
      for (const item of result.Items) {
        const user = unmarshall(item);
        responseStream.write(
          `${user.id},${user.name},${user.email},${user.created_at},${user.status}\n`
        );
        rowCount++;
      }

      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    responseStream.write(`\n# Total rows: ${rowCount}\n`);
    responseStream.end();
  }
);
```

This approach keeps memory usage flat regardless of how many rows you're exporting. The client starts receiving data almost immediately.

## Streaming JSON Arrays

Streaming JSON is trickier because the format needs proper structure. You can't just write random chunks. Here's how to stream a JSON array properly.

This streams a JSON array without buffering the entire array in memory:

```javascript
export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    const metadata = {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
    };

    responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

    responseStream.write('{"results": [');

    let first = true;
    let page = 0;

    while (page < 50) {
      const items = await fetchPage(page);
      if (items.length === 0) break;

      for (const item of items) {
        if (!first) responseStream.write(",");
        responseStream.write(JSON.stringify(item));
        first = false;
      }

      page++;
    }

    responseStream.write("], ");
    responseStream.write(`"totalPages": ${page}`);
    responseStream.write("}");
    responseStream.end();
  }
);
```

## Server-Sent Events (SSE)

Response streaming makes it possible to implement server-sent events directly from Lambda. This is great for progress updates or real-time notifications.

This example sends progress updates as server-sent events:

```javascript
export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    const metadata = {
      statusCode: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    };

    responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

    const steps = [
      "Validating input",
      "Querying database",
      "Processing records",
      "Generating output",
      "Finalizing",
    ];

    for (let i = 0; i < steps.length; i++) {
      // SSE format: "data: <content>\n\n"
      responseStream.write(`data: ${JSON.stringify({
        step: i + 1,
        total: steps.length,
        message: steps[i],
        progress: Math.round(((i + 1) / steps.length) * 100),
      })}\n\n`);

      // Simulate work
      await doWork(steps[i]);
    }

    responseStream.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    responseStream.end();
  }
);
```

## Using Pipelines with Streams

Since `responseStream` is a standard Node.js writable stream, you can pipe other streams into it. This is useful for transforming data on the fly.

This pipes a gzipped S3 object through a decompression transform to the response:

```javascript
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { createGunzip } from "zlib";
import { pipeline } from "stream/promises";

const s3 = new S3Client({});

export const handler = awslambda.streamifyResponse(
  async (event, responseStream, context) => {
    const metadata = {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
    };

    responseStream = awslambda.HttpResponseStream.from(responseStream, metadata);

    // Get a compressed file from S3
    const s3Response = await s3.send(
      new GetObjectCommand({
        Bucket: "my-data-bucket",
        Key: "large-dataset.json.gz",
      })
    );

    // Pipe: S3 stream -> decompress -> response stream
    const gunzip = createGunzip();
    await pipeline(s3Response.Body, gunzip, responseStream);
  }
);
```

## Limitations to Know About

Before you go all-in on response streaming, understand the constraints:

- **Function URLs only** - API Gateway and ALB don't support streaming responses. You need a Lambda function URL.
- **Node.js only** - As of now, response streaming is only available for the Node.js managed runtime and custom runtimes.
- **20MB soft limit** - Streaming pushes the response limit from 6MB to 20MB. You can request a quota increase.
- **Cost** - You're billed for the duration the stream is open, not just compute time. Long-running streams cost more.
- **No API Gateway features** - Since you're using function URLs, you lose API Gateway features like throttling, WAF, and usage plans.

## Consuming Streamed Responses

On the client side, consuming a streamed response is straightforward with the Fetch API:

```javascript
// Client-side code to consume a streaming Lambda response
async function consumeStream(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    console.log("Received chunk:", chunk);
    // Update your UI with the new data
    appendToOutput(chunk);
  }

  console.log("Stream complete");
}
```

## Wrapping Up

Response streaming unlocks patterns that simply weren't possible with Lambda before. The time-to-first-byte improvement alone makes it worth considering for any function that generates large responses. Just keep in mind the function URL requirement - if you need API Gateway features, you'll need to put CloudFront in front of the function URL or find a different approach. For monitoring the performance of your streaming functions, check out how to [set up Lambda monitoring](https://oneuptime.com/blog/post/2026-02-12-logging-monitoring-best-practices-aws/view).
