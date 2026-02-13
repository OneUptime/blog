# How to Use CDK L2 Constructs for Common AWS Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, TypeScript, Infrastructure as Code

Description: Practical examples of using CDK L2 constructs for the most common AWS resources including S3, Lambda, DynamoDB, SQS, SNS, and API Gateway.

---

L2 constructs are the workhorses of CDK. They wrap raw CloudFormation resources with smart defaults, type-safe properties, and convenience methods that save you from writing boilerplate. Most of your CDK code will use L2 constructs, so knowing the common patterns pays off quickly.

This post covers the L2 constructs you'll reach for most often, with practical examples you can drop into your own projects.

## S3 Buckets

S3 is probably the most common AWS resource in any project. The L2 construct sets good defaults out of the box - public access is blocked, encryption is enabled, and you get helpful methods for granting access.

```typescript
// Create an S3 bucket with common production settings
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';

const dataBucket = new s3.Bucket(this, 'DataBucket', {
  // Versioning keeps object history
  versioned: true,

  // Server-side encryption with S3-managed keys
  encryption: s3.BucketEncryption.S3_MANAGED,

  // Enforce SSL for all requests
  enforceSSL: true,

  // Lifecycle rules to manage costs
  lifecycleRules: [
    {
      transitions: [
        {
          storageClass: s3.StorageClass.INFREQUENT_ACCESS,
          transitionAfter: cdk.Duration.days(90),
        },
        {
          storageClass: s3.StorageClass.GLACIER,
          transitionAfter: cdk.Duration.days(365),
        },
      ],
    },
  ],

  // CORS rules for web access
  cors: [
    {
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
      allowedOrigins: ['https://myapp.example.com'],
      allowedHeaders: ['*'],
      maxAge: 3600,
    },
  ],
});
```

The `grant*` methods are one of the biggest time-savers. They handle IAM policies automatically.

```typescript
// Grant permissions to other resources - IAM policies are created automatically
dataBucket.grantRead(myLambdaFunction);          // Read-only access
dataBucket.grantWrite(myEcsTask);                 // Write-only access
dataBucket.grantReadWrite(myApiHandler);          // Full access
dataBucket.grantPut(myUploadFunction);            // PutObject only
dataBucket.grantDelete(myCleanupFunction);        // DeleteObject only
```

## Lambda Functions

Lambda L2 constructs handle the execution role, log groups, and environment configuration for you.

```typescript
// Create a Lambda function with common configuration
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';

const processOrderFunction = new lambda.Function(this, 'ProcessOrder', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  // Load code from a local directory
  code: lambda.Code.fromAsset('lambda/process-order'),

  timeout: cdk.Duration.seconds(30),
  memorySize: 512,

  // Control log retention (default is never expire)
  logRetention: logs.RetentionDays.TWO_WEEKS,

  // Environment variables
  environment: {
    TABLE_NAME: ordersTable.tableName,
    QUEUE_URL: processingQueue.queueUrl,
    LOG_LEVEL: 'INFO',
  },

  // Tracing for X-Ray
  tracing: lambda.Tracing.ACTIVE,

  // Dead letter queue for failed invocations
  deadLetterQueue: dlq,

  // Retry configuration
  retryAttempts: 2,
});
```

For Lambda functions with layers, the L2 construct simplifies layer management.

```typescript
// Create and use Lambda layers
const sharedLayer = new lambda.LayerVersion(this, 'SharedLayer', {
  code: lambda.Code.fromAsset('layers/shared'),
  compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
  description: 'Shared utilities and SDK clients',
});

const myFunction = new lambda.Function(this, 'MyFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/my-function'),
  layers: [sharedLayer],
});
```

## DynamoDB Tables

The DynamoDB L2 construct makes table creation clean and readable.

```typescript
// Create a DynamoDB table with indexes and auto-scaling
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const usersTable = new dynamodb.Table(this, 'UsersTable', {
  partitionKey: {
    name: 'userId',
    type: dynamodb.AttributeType.STRING,
  },
  sortKey: {
    name: 'createdAt',
    type: dynamodb.AttributeType.STRING,
  },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  // Enable point-in-time recovery
  pointInTimeRecovery: true,
  // Enable server-side encryption
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  // Stream changes for event-driven processing
  stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
});

// Add a Global Secondary Index
usersTable.addGlobalSecondaryIndex({
  indexName: 'EmailIndex',
  partitionKey: {
    name: 'email',
    type: dynamodb.AttributeType.STRING,
  },
});

// Grant access to Lambda
usersTable.grantReadWriteData(apiHandler);

// Connect DynamoDB Streams to a Lambda for change processing
processChangesFunction.addEventSource(
  new lambdaEventSources.DynamoEventSource(usersTable, {
    startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    batchSize: 10,
    retryAttempts: 3,
  })
);
```

## SQS Queues

SQS queues with dead letter queues are a common pattern.

```typescript
// Create SQS queues with DLQ pattern
import * as sqs from 'aws-cdk-lib/aws-sqs';

// Dead letter queue for failed messages
const dlq = new sqs.Queue(this, 'OrdersDLQ', {
  queueName: 'orders-dlq',
  retentionPeriod: cdk.Duration.days(14),
});

// Main processing queue
const ordersQueue = new sqs.Queue(this, 'OrdersQueue', {
  queueName: 'orders-queue',
  visibilityTimeout: cdk.Duration.seconds(60),
  retentionPeriod: cdk.Duration.days(7),
  // Dead letter queue configuration
  deadLetterQueue: {
    queue: dlq,
    maxReceiveCount: 3,  // Move to DLQ after 3 failed attempts
  },
  // Enable server-side encryption
  encryption: sqs.QueueEncryption.SQS_MANAGED,
});

// Grant send permissions to a Lambda
ordersQueue.grantSendMessages(orderCreatorFunction);

// Use the queue as an event source for processing
processorFunction.addEventSource(
  new lambdaEventSources.SqsEventSource(ordersQueue, {
    batchSize: 10,
    maxBatchingWindow: cdk.Duration.seconds(5),
  })
);
```

## SNS Topics

SNS topics with subscriptions are straightforward with L2 constructs.

```typescript
// Create an SNS topic with multiple subscriptions
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

const alertsTopic = new sns.Topic(this, 'AlertsTopic', {
  topicName: 'system-alerts',
  displayName: 'System Alerts',
});

// Email subscription
alertsTopic.addSubscription(
  new snsSubscriptions.EmailSubscription('ops@example.com')
);

// SQS subscription (fanout pattern)
alertsTopic.addSubscription(
  new snsSubscriptions.SqsSubscription(alertsQueue, {
    rawMessageDelivery: true,
  })
);

// Lambda subscription with filter
alertsTopic.addSubscription(
  new snsSubscriptions.LambdaSubscription(alertProcessorFunction, {
    filterPolicy: {
      severity: sns.SubscriptionFilter.stringFilter({
        allowlist: ['CRITICAL', 'HIGH'],
      }),
    },
  })
);
```

## API Gateway

API Gateway L2 constructs offer a lot of flexibility for building REST APIs.

```typescript
// Create a REST API with multiple resources and methods
import * as apigw from 'aws-cdk-lib/aws-apigateway';

const api = new apigw.RestApi(this, 'MyApi', {
  restApiName: 'My Service API',
  description: 'API for managing resources',
  deployOptions: {
    stageName: 'v1',
    throttlingRateLimit: 100,
    throttlingBurstLimit: 200,
    loggingLevel: apigw.MethodLoggingLevel.INFO,
  },
  defaultCorsPreflightOptions: {
    allowOrigins: apigw.Cors.ALL_ORIGINS,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Create resources and methods
const users = api.root.addResource('users');
users.addMethod('GET', new apigw.LambdaIntegration(listUsersFunction));
users.addMethod('POST', new apigw.LambdaIntegration(createUserFunction));

const singleUser = users.addResource('{userId}');
singleUser.addMethod('GET', new apigw.LambdaIntegration(getUserFunction));
singleUser.addMethod('PUT', new apigw.LambdaIntegration(updateUserFunction));

// Add API key and usage plan for rate limiting
const apiKey = api.addApiKey('ApiKey');
const usagePlan = api.addUsagePlan('UsagePlan', {
  name: 'Standard',
  throttle: {
    rateLimit: 50,
    burstLimit: 100,
  },
  quota: {
    limit: 10000,
    period: apigw.Period.MONTH,
  },
});
usagePlan.addApiKey(apiKey);
```

## Putting It All Together

The real power of L2 constructs shows when you combine them. The `grant*` methods and event source integrations create clean, readable infrastructure code where the relationships between resources are obvious.

```typescript
// A complete serverless pattern using L2 constructs
const table = new dynamodb.Table(this, 'Table', { /* ... */ });
const queue = new sqs.Queue(this, 'Queue', { /* ... */ });
const handler = new lambda.Function(this, 'Handler', { /* ... */ });

// Three lines to wire everything together
table.grantReadWriteData(handler);
queue.grantSendMessages(handler);
queue.grantConsumeMessages(handler);
```

Compare that to the dozens of lines of IAM policy JSON you'd write in CloudFormation. L2 constructs don't just save typing - they reduce the chance of permission errors by generating least-privilege policies automatically.

For an overview of how L2 fits into the broader construct hierarchy, check out the post on [understanding CDK constructs L1, L2, and L3](https://oneuptime.com/blog/post/2026-02-12-understand-cdk-constructs-l1-l2-l3/view). When L2 constructs don't expose what you need, learn about [CDK escape hatches](https://oneuptime.com/blog/post/2026-02-12-cdk-escape-hatches-access-l1-constructs/view) to access the underlying L1 layer.
