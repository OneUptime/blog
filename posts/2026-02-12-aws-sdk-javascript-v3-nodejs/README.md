# How to Use the AWS SDK for JavaScript v3 (Node.js)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, JavaScript, Node.js, SDK

Description: A comprehensive introduction to the AWS SDK for JavaScript v3 in Node.js, covering installation, client setup, making API calls, and key differences from v2.

---

The AWS SDK for JavaScript v3 is a complete rewrite of the v2 SDK. It's modular, tree-shakeable, and designed for modern JavaScript. Instead of importing the entire AWS SDK (which was massive), you now install only the service clients you need. If you're building Node.js applications that talk to AWS, v3 is what you should be using. Let's get started.

## Installation

Unlike v2 where you installed one giant `aws-sdk` package, v3 uses separate packages for each service.

Install only the service clients your application needs.

```bash
# Install specific service clients
npm install @aws-sdk/client-s3
npm install @aws-sdk/client-dynamodb
npm install @aws-sdk/client-lambda

# Install higher-level abstractions if needed
npm install @aws-sdk/lib-dynamodb   # DynamoDB DocumentClient equivalent
npm install @aws-sdk/lib-storage    # Managed uploads for S3
```

## Creating a Client

Every interaction starts with creating a service client. The client constructor takes a configuration object.

```javascript
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

// Create an S3 client with default credentials
const s3 = new S3Client({ region: 'us-east-1' });

// Make an API call using a command object
const response = await s3.send(new ListBucketsCommand({}));

console.log('Buckets:');
for (const bucket of response.Buckets) {
    console.log(`  ${bucket.Name} (created: ${bucket.CreationDate})`);
}
```

The key difference from v2 is the command pattern. Instead of calling methods directly on the client, you create command objects and pass them to `client.send()`.

## The Command Pattern

Every API operation in v3 is a command. Commands are classes that encapsulate the request parameters and the operation to perform.

```javascript
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand
} from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Upload an object
await s3.send(new PutObjectCommand({
    Bucket: 'my-bucket',
    Key: 'data.json',
    Body: JSON.stringify({ hello: 'world' }),
    ContentType: 'application/json'
}));

// Get an object
const getResponse = await s3.send(new GetObjectCommand({
    Bucket: 'my-bucket',
    Key: 'data.json'
}));

// The body is a readable stream in v3
const bodyString = await getResponse.Body.transformToString();
console.log(JSON.parse(bodyString));

// Delete an object
await s3.send(new DeleteObjectCommand({
    Bucket: 'my-bucket',
    Key: 'data.json'
}));
```

## Working with DynamoDB

DynamoDB in v3 comes with two interfaces: the low-level client and the higher-level DocumentClient.

The low-level client requires you to specify DynamoDB types explicitly.

```javascript
import { DynamoDBClient, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({ region: 'us-east-1' });

// Put an item with explicit type annotations
await dynamodb.send(new PutItemCommand({
    TableName: 'users',
    Item: {
        user_id: { S: 'user-123' },
        name: { S: 'Alice Johnson' },
        age: { N: '30' },
        active: { BOOL: true }
    }
}));

// Get an item
const response = await dynamodb.send(new GetItemCommand({
    TableName: 'users',
    Key: { user_id: { S: 'user-123' } }
}));

console.log(response.Item);
// { user_id: { S: 'user-123' }, name: { S: 'Alice Johnson' }, ... }
```

The DocumentClient (from `@aws-sdk/lib-dynamodb`) handles type marshalling automatically, which is much nicer.

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

// Put an item - just use regular JavaScript types
await docClient.send(new PutCommand({
    TableName: 'users',
    Item: {
        user_id: 'user-123',
        name: 'Alice Johnson',
        age: 30,
        active: true,
        tags: ['admin', 'premium']
    }
}));

// Get an item - response uses regular types too
const response = await docClient.send(new GetCommand({
    TableName: 'users',
    Key: { user_id: 'user-123' }
}));

console.log(response.Item);
// { user_id: 'user-123', name: 'Alice Johnson', age: 30, ... }
```

## Working with Lambda

Invoking Lambda functions follows the same command pattern.

```javascript
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambda = new LambdaClient({ region: 'us-east-1' });

const response = await lambda.send(new InvokeCommand({
    FunctionName: 'my-processor',
    Payload: JSON.stringify({ user_id: 'user-123', action: 'process' })
}));

// Decode the response payload
const result = JSON.parse(Buffer.from(response.Payload).toString());
console.log(result);
```

## Error Handling

Error handling in v3 gives you typed exceptions for each service.

```javascript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { NoSuchKey, NoSuchBucket } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

try {
    await s3.send(new GetObjectCommand({
        Bucket: 'my-bucket',
        Key: 'nonexistent.txt'
    }));
} catch (error) {
    if (error instanceof NoSuchKey) {
        console.log('Object does not exist');
    } else if (error instanceof NoSuchBucket) {
        console.log('Bucket does not exist');
    } else if (error.name === 'AccessDenied') {
        console.log('Permission denied');
    } else {
        console.error('Unexpected error:', error);
        throw error;
    }
}
```

## Pagination

V3 provides built-in paginators that handle continuation tokens automatically.

```javascript
import { S3Client, paginateListObjectsV2 } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Paginate through all objects in a bucket
const paginator = paginateListObjectsV2(
    { client: s3 },
    { Bucket: 'my-bucket', Prefix: 'logs/' }
);

let totalObjects = 0;
for await (const page of paginator) {
    for (const object of page.Contents || []) {
        console.log(`${object.Key} (${object.Size} bytes)`);
        totalObjects++;
    }
}
console.log(`Total: ${totalObjects} objects`);
```

## Configuring Retries

V3 uses a configurable retry strategy.

```javascript
import { S3Client } from '@aws-sdk/client-s3';

// Configure retries
const s3 = new S3Client({
    region: 'us-east-1',
    maxAttempts: 5  // default is 3
});
```

## Streaming Responses

One major change in v3 is that response bodies from S3 are streams, not buffers. Here's how to handle them.

```javascript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const s3 = new S3Client({ region: 'us-east-1' });

const response = await s3.send(new GetObjectCommand({
    Bucket: 'my-bucket',
    Key: 'large-file.csv'
}));

// Stream to a file
await pipeline(response.Body, createWriteStream('/tmp/large-file.csv'));
console.log('File downloaded');

// Or convert to string for small responses
const text = await response.Body.transformToString();

// Or convert to buffer
const buffer = await response.Body.transformToByteArray();
```

## TypeScript Support

V3 is built in TypeScript and has first-class type support. Every command input and output is fully typed.

```typescript
import { S3Client, PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Full type checking on the input
const input: PutObjectCommandInput = {
    Bucket: 'my-bucket',
    Key: 'data.json',
    Body: JSON.stringify({ version: 1 }),
    ContentType: 'application/json',
    Metadata: {
        'uploaded-by': 'my-app'
    }
};

const response = await s3.send(new PutObjectCommand(input));
// response is fully typed as PutObjectCommandOutput
console.log(response.ETag);
```

## Best Practices

- **Install only what you need.** The modular architecture means smaller bundles and faster cold starts in Lambda.
- **Reuse client instances.** Don't create a new client for every request. Create one at module level and reuse it.
- **Use the DocumentClient for DynamoDB.** It saves you from manually marshalling types.
- **Handle streams properly.** Don't forget that S3 response bodies are streams in v3.
- **Use paginators for list operations.** They handle continuation tokens automatically.

For more on setting up credentials for your clients, see the guide on [handling credentials in AWS SDK v3](https://oneuptime.com/blog/post/2026-02-12-credentials-aws-sdk-javascript-v3/view). If you're migrating from v2, check out the [migration guide](https://oneuptime.com/blog/post/2026-02-12-migrate-aws-sdk-v2-to-v3-nodejs/view) for a step-by-step walkthrough.
