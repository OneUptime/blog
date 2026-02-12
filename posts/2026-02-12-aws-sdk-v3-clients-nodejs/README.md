# How to Set Up AWS SDK v3 Clients in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, JavaScript, Node.js, SDK

Description: A detailed guide to setting up and configuring AWS SDK v3 clients in Node.js, including region configuration, custom endpoints, client reuse patterns, and advanced options.

---

Setting up AWS SDK v3 clients properly is the foundation of any Node.js application that talks to AWS. Get it right and you'll have reliable, performant AWS calls. Get it wrong and you'll deal with mysterious timeout errors, credential failures, and wasted cold start time in Lambda. Let's cover all the configuration options and patterns you need.

## Basic Client Setup

Every v3 client takes a configuration object. At minimum, you need to specify the region.

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';

// Basic client creation
const s3 = new S3Client({ region: 'us-east-1' });
const dynamodb = new DynamoDBClient({ region: 'us-west-2' });
const lambda = new LambdaClient({ region: 'eu-west-1' });
```

If you don't specify a region, the SDK looks for it in environment variables (`AWS_REGION` or `AWS_DEFAULT_REGION`), then in your AWS config file (`~/.aws/config`).

## Region Configuration Strategies

You'll want different region strategies for different environments.

```javascript
import { S3Client } from '@aws-sdk/client-s3';

// Option 1: Hardcode the region (simple, but inflexible)
const s3 = new S3Client({ region: 'us-east-1' });

// Option 2: Use environment variable (recommended for most cases)
const s3Env = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1'
});

// Option 3: Multi-region setup
function createClient(ServiceClient, region) {
    return new ServiceClient({
        region: region || process.env.AWS_REGION || 'us-east-1'
    });
}
```

## Custom Endpoints

Custom endpoints are essential for local development with tools like LocalStack, or when using VPC endpoints.

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// LocalStack endpoint for local development
const s3Local = new S3Client({
    region: 'us-east-1',
    endpoint: 'http://localhost:4566',
    forcePathStyle: true,  // required for LocalStack S3
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
    }
});

// DynamoDB local
const dynamoLocal = new DynamoDBClient({
    region: 'us-east-1',
    endpoint: 'http://localhost:8000',
    credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test'
    }
});

// VPC endpoint
const s3Vpc = new S3Client({
    region: 'us-east-1',
    endpoint: 'https://bucket.vpce-1234567890-abcdefg.s3.us-east-1.vpce.amazonaws.com'
});
```

## Timeout and Retry Configuration

Network issues happen. Configure timeouts and retries to handle them gracefully.

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import https from 'https';

// Configure HTTP handler with custom timeouts
const httpHandler = new NodeHttpHandler({
    connectionTimeout: 5000,   // 5 seconds to establish connection
    requestTimeout: 30000,     // 30 seconds for the request to complete
    httpsAgent: new https.Agent({
        maxSockets: 50,        // connection pool size
        keepAlive: true,       // reuse connections
        keepAliveMsecs: 1000
    })
});

const s3 = new S3Client({
    region: 'us-east-1',
    requestHandler: httpHandler,
    maxAttempts: 5  // retry up to 5 times on transient failures
});
```

## Client Reuse Pattern

Creating a new client for every request is wasteful. The SDK establishes connections, resolves credentials, and does other setup work. Reuse clients across requests.

This module pattern creates clients once and exports them for reuse.

```javascript
// aws-clients.js - create clients once and export them
import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { SQSClient } from '@aws-sdk/client-sqs';

const region = process.env.AWS_REGION || 'us-east-1';

// Create shared clients
export const s3Client = new S3Client({ region });

const dynamoBaseClient = new DynamoDBClient({ region });
export const dynamoClient = DynamoDBDocumentClient.from(dynamoBaseClient, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false
    }
});

export const lambdaClient = new LambdaClient({ region });
export const sqsClient = new SQSClient({ region });
```

Then import them wherever needed.

```javascript
// some-handler.js
import { s3Client, dynamoClient } from './aws-clients.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

export async function handler(event) {
    const [s3Data, dbData] = await Promise.all([
        s3Client.send(new GetObjectCommand({
            Bucket: 'my-bucket',
            Key: 'config.json'
        })),
        dynamoClient.send(new GetCommand({
            TableName: 'settings',
            Key: { id: 'app-config' }
        }))
    ]);

    // Process data...
}
```

## Environment-Aware Client Factory

For applications that run in multiple environments, a factory function keeps things clean.

```javascript
import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const isLocal = process.env.NODE_ENV === 'development';
const localEndpoint = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';

function getBaseConfig() {
    const config = {
        region: process.env.AWS_REGION || 'us-east-1'
    };

    if (isLocal) {
        config.endpoint = localEndpoint;
        config.credentials = {
            accessKeyId: 'test',
            secretAccessKey: 'test'
        };
    }

    return config;
}

export function createS3Client() {
    const config = getBaseConfig();
    if (isLocal) {
        config.forcePathStyle = true;
    }
    return new S3Client(config);
}

export function createDynamoDocClient() {
    const baseClient = new DynamoDBClient(getBaseConfig());
    return DynamoDBDocumentClient.from(baseClient);
}
```

## Logger Configuration

Enable SDK logging for debugging API calls.

```javascript
import { S3Client } from '@aws-sdk/client-s3';

// Simple console logger
const s3 = new S3Client({
    region: 'us-east-1',
    logger: console  // logs all SDK operations to console
});

// Custom logger that only logs certain levels
const customLogger = {
    debug: () => {},  // suppress debug messages
    info: (msg) => console.log(`[AWS INFO] ${msg}`),
    warn: (msg) => console.warn(`[AWS WARN] ${msg}`),
    error: (msg) => console.error(`[AWS ERROR] ${msg}`)
};

const s3Logged = new S3Client({
    region: 'us-east-1',
    logger: customLogger
});
```

## Client Configuration for Lambda

Lambda functions have specific optimization needs. The runtime provides credentials and region automatically through environment variables.

```javascript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

// In Lambda, region and credentials come from the environment automatically
// Create clients outside the handler for reuse across invocations
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    // The client is reused across warm invocations
    const result = await docClient.send(new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { id: event.id }
    }));

    return {
        statusCode: 200,
        body: JSON.stringify(result.Item)
    };
};
```

## Middleware for All Clients

You can add middleware to modify requests before they're sent or responses before they're returned. This is one of v3's most powerful features.

```javascript
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

// Add middleware to log every request
s3.middlewareStack.add(
    (next, context) => async (args) => {
        console.log(`Calling: ${context.commandName}`);
        console.log(`Input:`, JSON.stringify(args.input, null, 2));

        const start = Date.now();
        const result = await next(args);
        const duration = Date.now() - start;

        console.log(`${context.commandName} took ${duration}ms`);
        return result;
    },
    {
        step: 'initialize',
        name: 'loggingMiddleware',
        tags: ['LOGGING']
    }
);

// Now every call through this client gets logged
await s3.send(new GetObjectCommand({ Bucket: 'my-bucket', Key: 'test.txt' }));
```

For a deep dive into the middleware system, check out the guide on [AWS SDK v3 middleware](https://oneuptime.com/blog/post/aws-sdk-javascript-v3-middleware/view).

## Best Practices

- **Create clients at module level**, not inside functions. This avoids repeated initialization overhead.
- **Don't hardcode credentials** in client configurations. Let the SDK resolve them from environment variables, IAM roles, or config files.
- **Set appropriate timeouts** for your use case. The defaults work for most cases, but long-running operations may need longer timeouts.
- **Use connection pooling** with `keepAlive: true` in the HTTP agent for high-throughput applications.
- **Configure retries** based on your application's tolerance for latency vs. reliability.

For handling credentials across different environments, see the detailed guide on [credential management in AWS SDK v3](https://oneuptime.com/blog/post/credentials-aws-sdk-javascript-v3/view). If you're testing locally, [LocalStack](https://oneuptime.com/blog/post/localstack-test-aws-services-locally/view) is a great companion for your development workflow.
