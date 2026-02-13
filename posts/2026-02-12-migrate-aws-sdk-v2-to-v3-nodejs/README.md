# How to Migrate from AWS SDK v2 to v3 in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, JavaScript, Node.js, Migration

Description: A step-by-step guide to migrating your Node.js application from AWS SDK v2 to v3, with before/after code examples for S3, DynamoDB, Lambda, and common patterns.

---

Migrating from AWS SDK v2 to v3 isn't just a package update - it's a fundamental change in how you write AWS code in Node.js. The v3 SDK is modular, uses a command pattern, and handles things like streams differently. The good news is that the migration can be done incrementally. Let's walk through every major change with before/after examples.

## Why Migrate?

The v2 SDK still works, but there are real reasons to move:

- **Bundle size.** V2 imports the entire SDK (~70 MB). V3 lets you import only what you need.
- **Tree shaking.** V3's modular design works with modern bundlers.
- **Lambda cold starts.** Smaller bundles mean faster cold starts.
- **TypeScript support.** V3 is built in TypeScript with full type coverage.
- **Active development.** New features and services go to v3 first.
- **Middleware system.** V3's middleware is far more powerful than v2's events.

## Installation Changes

The biggest structural change is going from one package to many.

```bash
# v2 - one package for everything
npm install aws-sdk

# v3 - individual packages per service
npm install @aws-sdk/client-s3
npm install @aws-sdk/client-dynamodb
npm install @aws-sdk/lib-dynamodb        # DocumentClient replacement
npm install @aws-sdk/client-lambda
npm install @aws-sdk/client-sqs
npm install @aws-sdk/lib-storage         # S3 managed uploads
npm install @aws-sdk/s3-request-presigner # presigned URLs
```

## Import Changes

Every import needs to change from the single `aws-sdk` package to individual service packages.

```javascript
// v2
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// v3
import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const s3 = new S3Client({ region: 'us-east-1' });
const dynamodb = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: 'us-east-1' })
);
```

## S3 Operations

S3 is where you'll feel the biggest difference. Let's convert the most common operations.

**Listing buckets:**

```javascript
// v2
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const data = await s3.listBuckets().promise();
console.log(data.Buckets);

// v3
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';
const s3 = new S3Client({ region: 'us-east-1' });
const data = await s3.send(new ListBucketsCommand({}));
console.log(data.Buckets);
```

**Getting an object:**

```javascript
// v2
const data = await s3.getObject({
    Bucket: 'my-bucket',
    Key: 'file.txt'
}).promise();
const body = data.Body.toString('utf-8');  // Body is a Buffer

// v3
import { GetObjectCommand } from '@aws-sdk/client-s3';
const data = await s3.send(new GetObjectCommand({
    Bucket: 'my-bucket',
    Key: 'file.txt'
}));
// Body is a ReadableStream in v3 - you need to consume it
const body = await data.Body.transformToString();
```

**Uploading (managed upload):**

```javascript
// v2
const upload = s3.upload({
    Bucket: 'my-bucket',
    Key: 'large-file.zip',
    Body: readStream
});
upload.on('httpUploadProgress', (progress) => {
    console.log(`Progress: ${progress.loaded}/${progress.total}`);
});
await upload.promise();

// v3
import { Upload } from '@aws-sdk/lib-storage';
const upload = new Upload({
    client: s3,
    params: {
        Bucket: 'my-bucket',
        Key: 'large-file.zip',
        Body: readStream
    }
});
upload.on('httpUploadProgress', (progress) => {
    console.log(`Progress: ${progress.loaded}/${progress.total}`);
});
await upload.done();
```

**Presigned URLs:**

```javascript
// v2
const url = s3.getSignedUrl('getObject', {
    Bucket: 'my-bucket',
    Key: 'file.txt',
    Expires: 3600
});

// v3
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const url = await getSignedUrl(s3, new GetObjectCommand({
    Bucket: 'my-bucket',
    Key: 'file.txt'
}), { expiresIn: 3600 });
```

## DynamoDB Operations

**DocumentClient replacement:**

```javascript
// v2
const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

await docClient.put({
    TableName: 'users',
    Item: { user_id: '123', name: 'Alice', age: 30 }
}).promise();

const result = await docClient.get({
    TableName: 'users',
    Key: { user_id: '123' }
}).promise();

// v3
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));

await docClient.send(new PutCommand({
    TableName: 'users',
    Item: { user_id: '123', name: 'Alice', age: 30 }
}));

const result = await docClient.send(new GetCommand({
    TableName: 'users',
    Key: { user_id: '123' }
}));
```

**Querying:**

```javascript
// v2
const data = await docClient.query({
    TableName: 'orders',
    KeyConditionExpression: 'customer_id = :cid',
    ExpressionAttributeValues: { ':cid': 'cust-123' }
}).promise();

// v3
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
const data = await docClient.send(new QueryCommand({
    TableName: 'orders',
    KeyConditionExpression: 'customer_id = :cid',
    ExpressionAttributeValues: { ':cid': 'cust-123' }
}));
```

## Lambda Invocation

```javascript
// v2
const AWS = require('aws-sdk');
const lambda = new AWS.Lambda();
const result = await lambda.invoke({
    FunctionName: 'my-function',
    Payload: JSON.stringify({ key: 'value' })
}).promise();
const payload = JSON.parse(result.Payload);

// v3
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
const lambda = new LambdaClient({});
const result = await lambda.send(new InvokeCommand({
    FunctionName: 'my-function',
    Payload: JSON.stringify({ key: 'value' })
}));
const payload = JSON.parse(Buffer.from(result.Payload).toString());
```

## Pagination

Pagination got significantly better in v3.

```javascript
// v2 - manual pagination
let items = [];
let lastKey = undefined;
do {
    const params = {
        TableName: 'my-table',
        ExclusiveStartKey: lastKey
    };
    const data = await docClient.scan(params).promise();
    items = items.concat(data.Items);
    lastKey = data.LastEvaluatedKey;
} while (lastKey);

// v3 - built-in paginators
import { paginateScan } from '@aws-sdk/client-dynamodb';
const paginator = paginateScan({ client: dynamodb }, { TableName: 'my-table' });
const items = [];
for await (const page of paginator) {
    items.push(...(page.Items || []));
}
```

## Error Handling

```javascript
// v2
try {
    await s3.getObject({ Bucket: 'b', Key: 'k' }).promise();
} catch (err) {
    if (err.code === 'NoSuchKey') {
        console.log('Object not found');
    }
}

// v3 - service-specific error classes
import { NoSuchKey } from '@aws-sdk/client-s3';
try {
    await s3.send(new GetObjectCommand({ Bucket: 'b', Key: 'k' }));
} catch (err) {
    if (err instanceof NoSuchKey) {
        console.log('Object not found');
    }
    // Or use err.name
    if (err.name === 'NoSuchKey') {
        console.log('Object not found');
    }
}
```

## Credential Configuration

```javascript
// v2
AWS.config.update({
    accessKeyId: 'AKID',
    secretAccessKey: 'SECRET',
    region: 'us-east-1'
});

// v3 - per-client configuration
import { fromIni } from '@aws-sdk/credential-providers';
const s3 = new S3Client({
    region: 'us-east-1',
    credentials: fromIni({ profile: 'my-profile' })
});
```

## Incremental Migration Strategy

You don't have to migrate everything at once. V2 and v3 can coexist in the same project.

```javascript
// Both can run side by side during migration
const AWS = require('aws-sdk');  // v2 for services not yet migrated
import { S3Client } from '@aws-sdk/client-s3';  // v3 for migrated services

// Migrate one service at a time
const s3v3 = new S3Client({});  // migrated
const sqs = new AWS.SQS();       // not yet migrated
```

A good migration order is:
1. Start with the services you use most frequently
2. Migrate read operations first (lower risk)
3. Then migrate write operations
4. Finally, migrate edge cases and rarely used services

## Automated Migration with Codemods

AWS provides a codemod tool to automate parts of the migration.

```bash
# Install the codemod
npx aws-sdk-js-codemod -t v2-to-v3 path/to/your/files
```

The codemod handles basic transformations but may need manual review for complex patterns.

## Best Practices for the Migration

- **Write tests before migrating.** Make sure your existing code has test coverage so you can verify the migration.
- **Migrate one service at a time.** Don't try to do everything at once.
- **Watch for stream behavior changes.** S3 response bodies changed from Buffers to ReadableStreams.
- **Check bundle size improvements.** Measure the actual impact on your Lambda deployment package.
- **Update error handling.** Error structure changed, so audit your catch blocks.

For setting up v3 clients properly after migration, see the [client setup guide](https://oneuptime.com/blog/post/2026-02-12-aws-sdk-v3-clients-nodejs/view). And for a full overview of v3 capabilities, read the [AWS SDK v3 introduction](https://oneuptime.com/blog/post/2026-02-12-aws-sdk-javascript-v3-nodejs/view).
