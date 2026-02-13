# How to Create a Lambda Function with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Lambda, Serverless, TypeScript

Description: A complete guide to creating Lambda functions with CDK covering code packaging, environment variables, layers, event sources, permissions, and advanced configurations.

---

Lambda is the bread and butter of serverless on AWS, and CDK makes it genuinely pleasant to work with. The L2 Lambda construct handles execution roles, log groups, and permissions automatically. Pair it with the NodejsFunction or PythonFunction constructs, and CDK even compiles and bundles your code during deployment.

Let's walk through everything you need to create, configure, and wire up Lambda functions with CDK.

## Basic Lambda Function

The simplest Lambda function uses inline code. Good for quick prototypes and simple handlers.

```typescript
// Create a basic Lambda function with inline code
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';

const helloFunction = new lambda.Function(this, 'HelloFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
    exports.handler = async (event) => {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Hello from Lambda!' }),
      };
    };
  `),
});
```

CDK automatically creates an execution role with basic Lambda permissions (CloudWatch Logs write access) and a log group. You don't have to think about IAM for the basics.

## Lambda with External Code

For real projects, you'll want your Lambda code in separate files.

```typescript
// Lambda function with code from a local directory
const processOrderFunction = new lambda.Function(this, 'ProcessOrder', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  // CDK zips this directory and uploads it to S3
  code: lambda.Code.fromAsset('lambda/process-order'),

  // Configuration
  timeout: cdk.Duration.seconds(30),
  memorySize: 512,
  architecture: lambda.Architecture.ARM_64,  // ARM is cheaper and often faster

  // Environment variables
  environment: {
    TABLE_NAME: ordersTable.tableName,
    QUEUE_URL: notificationQueue.queueUrl,
    LOG_LEVEL: 'INFO',
  },

  // Logging
  logRetention: logs.RetentionDays.TWO_WEEKS,

  // Tracing
  tracing: lambda.Tracing.ACTIVE,

  // Reserved concurrency (limits max concurrent executions)
  reservedConcurrentExecutions: 100,
});
```

The project structure for this would be something like:

```
my-cdk-app/
  lambda/
    process-order/
      index.js
      package.json
      node_modules/
  lib/
    my-stack.ts
```

## NodejsFunction: TypeScript Support

The `NodejsFunction` construct is specifically designed for Node.js. It compiles TypeScript, bundles with esbuild, and produces optimized deployment packages.

```typescript
// TypeScript Lambda with automatic bundling
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';

const apiHandler = new nodejs.NodejsFunction(this, 'ApiHandler', {
  // Point directly to a TypeScript file
  entry: 'lambda/api/handler.ts',
  handler: 'handler',
  runtime: lambda.Runtime.NODEJS_20_X,
  architecture: lambda.Architecture.ARM_64,
  timeout: cdk.Duration.seconds(10),
  memorySize: 256,

  bundling: {
    minify: true,
    sourceMap: true,
    // Don't bundle AWS SDK (it's in the Lambda runtime)
    externalModules: ['@aws-sdk/*'],
  },

  environment: {
    NODE_OPTIONS: '--enable-source-maps',
    TABLE_NAME: table.tableName,
  },
});
```

## Lambda Layers

Layers let you share code and dependencies across multiple functions.

```typescript
// Create a shared dependencies layer
const depsLayer = new lambda.LayerVersion(this, 'DepsLayer', {
  code: lambda.Code.fromAsset('layers/dependencies'),
  compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
  compatibleArchitectures: [lambda.Architecture.ARM_64],
  description: 'Shared npm dependencies',
});

// Create a utilities layer
const utilsLayer = new lambda.LayerVersion(this, 'UtilsLayer', {
  code: lambda.Code.fromAsset('layers/utils'),
  compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
  description: 'Shared utility functions',
});

// Use layers in your functions
const myFunction = new lambda.Function(this, 'MyFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/my-function'),
  layers: [depsLayer, utilsLayer],
});
```

## Event Sources

CDK has event source mappings for the most common Lambda triggers.

```typescript
// SQS event source - process messages from a queue
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';

processOrderFunction.addEventSource(
  new eventsources.SqsEventSource(ordersQueue, {
    batchSize: 10,
    maxBatchingWindow: cdk.Duration.seconds(5),
    reportBatchItemFailures: true,  // Partial batch failure handling
  }),
);

// DynamoDB Streams event source
processOrderFunction.addEventSource(
  new eventsources.DynamoEventSource(ordersTable, {
    startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    batchSize: 100,
    retryAttempts: 3,
    filters: [
      lambda.FilterCriteria.filter({
        eventName: lambda.FilterRule.isEqual('INSERT'),
      }),
    ],
  }),
);

// S3 event notification
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';

uploadBucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(imageProcessorFunction),
  { prefix: 'uploads/', suffix: '.jpg' },
);

// API Gateway integration
import * as apigw from 'aws-cdk-lib/aws-apigateway';

const api = new apigw.RestApi(this, 'Api');
const items = api.root.addResource('items');
items.addMethod('GET', new apigw.LambdaIntegration(listItemsFunction));
items.addMethod('POST', new apigw.LambdaIntegration(createItemFunction));

// Scheduled event (cron)
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

const rule = new events.Rule(this, 'DailyCleanup', {
  schedule: events.Schedule.cron({
    minute: '0',
    hour: '2',  // 2 AM UTC daily
  }),
});
rule.addTarget(new targets.LambdaFunction(cleanupFunction));
```

## Permissions

CDK's grant methods handle IAM permissions automatically.

```typescript
// Grant permissions to the Lambda function
// DynamoDB
ordersTable.grantReadWriteData(processOrderFunction);

// S3
dataBucket.grantRead(processOrderFunction);
reportsBucket.grantWrite(processOrderFunction);

// SQS
notificationQueue.grantSendMessages(processOrderFunction);

// SNS
alertTopic.grantPublish(processOrderFunction);

// Secrets Manager
dbSecret.grantRead(processOrderFunction);

// For custom IAM permissions
processOrderFunction.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['ses:SendEmail'],
  resources: ['*'],
}));
```

## Dead Letter Queues

Configure DLQs for handling failed invocations.

```typescript
// Lambda with dead letter queue for failed async invocations
const dlq = new sqs.Queue(this, 'FunctionDLQ', {
  retentionPeriod: cdk.Duration.days(14),
});

const myFunction = new lambda.Function(this, 'MyFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/handler'),
  deadLetterQueue: dlq,
  retryAttempts: 2,
  maxEventAge: cdk.Duration.hours(2),
});
```

## Lambda with VPC Access

For functions that need to access VPC resources like RDS or ElastiCache.

```typescript
// Lambda function deployed inside a VPC
const vpcFunction = new lambda.Function(this, 'VpcFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/vpc-handler'),
  vpc: vpc,
  vpcSubnets: {
    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
  },
  // Security group for the function
  securityGroups: [lambdaSg],
  timeout: cdk.Duration.seconds(30),
  environment: {
    DB_HOST: database.instanceEndpoint.hostname,
    DB_PORT: database.instanceEndpoint.port.toString(),
  },
});

// Allow the Lambda to connect to the database
database.connections.allowFrom(vpcFunction, ec2.Port.tcp(5432));
```

## Function URLs

Lambda function URLs give you an HTTPS endpoint without API Gateway.

```typescript
// Create a Lambda with a Function URL
const webHandler = new lambda.Function(this, 'WebHandler', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/web'),
});

// Add a function URL
const functionUrl = webHandler.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,  // Public access
  cors: {
    allowedOrigins: ['https://myapp.example.com'],
    allowedMethods: [lambda.HttpMethod.ALL],
    allowedHeaders: ['*'],
  },
});

// Output the URL
new cdk.CfnOutput(this, 'FunctionUrl', {
  value: functionUrl.url,
});
```

## Aliases and Versioning

For production deployments with traffic shifting.

```typescript
// Create a version and alias for production traffic management
const currentVersion = myFunction.currentVersion;

const prodAlias = new lambda.Alias(this, 'ProdAlias', {
  aliasName: 'prod',
  version: currentVersion,
});

// Configure provisioned concurrency on the alias
prodAlias.addAutoScaling({
  minCapacity: 5,
  maxCapacity: 50,
}).scaleOnUtilization({ utilizationTarget: 0.7 });
```

Lambda with CDK removes all the boilerplate. The automatic IAM role creation, log group management, and event source wiring let you focus on your business logic instead of AWS plumbing. For bundling Lambda code with CDK assets, see the post on [CDK assets for bundling Lambda code](https://oneuptime.com/blog/post/2026-02-12-cdk-assets-bundling-lambda-code/view). For Docker-based Lambda functions, check out [using CDK with Docker assets](https://oneuptime.com/blog/post/2026-02-12-cdk-with-docker-assets/view).
