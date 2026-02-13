# How to Set Up DynamoDB with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, CDK, Infrastructure as Code, TypeScript

Description: Learn how to create and configure DynamoDB tables using AWS CDK with TypeScript, including GSIs, auto-scaling, streams, and best practices for production.

---

AWS CDK is the best way to manage DynamoDB tables as code. You get type checking, IDE autocomplete, and the ability to compose complex table configurations without dealing with raw CloudFormation templates. Let's set up a production-ready DynamoDB table with all the bells and whistles.

## Getting Started

If you don't have CDK installed yet, set it up and create a new project.

```bash
# Install CDK globally
npm install -g aws-cdk

# Create a new CDK project with TypeScript
mkdir dynamodb-cdk && cd dynamodb-cdk
cdk init app --language typescript

# Install the DynamoDB construct library (included in aws-cdk-lib)
npm install aws-cdk-lib constructs
```

## Basic Table Creation

Start with a simple table definition. CDK's `Table` construct handles all the CloudFormation plumbing.

```typescript
// lib/dynamodb-stack.ts
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DynamoDbStack extends cdk.Stack {
  // Expose the table so other stacks can reference it
  public readonly usersTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a basic DynamoDB table with a partition key
    this.usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'Users',
      partitionKey: {
        name: 'user_id',
        type: dynamodb.AttributeType.STRING,
      },
      // On-demand billing is simpler for getting started
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // DESTROY means the table is deleted when the stack is deleted
      // Use RETAIN for production tables
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
```

## Adding a Sort Key and GSIs

Most real-world tables need a sort key and at least one Global Secondary Index.

```typescript
// A table with composite key and multiple GSIs
const ordersTable = new dynamodb.Table(this, 'OrdersTable', {
  tableName: 'Orders',
  // Composite primary key: customer_id (partition) + order_date (sort)
  partitionKey: {
    name: 'customer_id',
    type: dynamodb.AttributeType.STRING,
  },
  sortKey: {
    name: 'order_date',
    type: dynamodb.AttributeType.STRING,
  },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  // Enable point-in-time recovery for production tables
  pointInTimeRecovery: true,
});

// Add a GSI to query orders by status
ordersTable.addGlobalSecondaryIndex({
  indexName: 'status-index',
  partitionKey: {
    name: 'status',
    type: dynamodb.AttributeType.STRING,
  },
  sortKey: {
    name: 'order_date',
    type: dynamodb.AttributeType.STRING,
  },
  // Only project the attributes you need to reduce storage costs
  projectionType: dynamodb.ProjectionType.INCLUDE,
  nonKeyAttributes: ['total_amount', 'customer_id'],
});

// Add a GSI to look up orders by order ID
ordersTable.addGlobalSecondaryIndex({
  indexName: 'order-id-index',
  partitionKey: {
    name: 'order_id',
    type: dynamodb.AttributeType.STRING,
  },
  projectionType: dynamodb.ProjectionType.ALL,
});
```

## Adding a Local Secondary Index

LSIs must be defined at table creation time (you can't add them later). They share the same partition key as the base table but have a different sort key.

```typescript
// LSI must be added during table creation
const messagesTable = new dynamodb.Table(this, 'MessagesTable', {
  tableName: 'Messages',
  partitionKey: {
    name: 'channel_id',
    type: dynamodb.AttributeType.STRING,
  },
  sortKey: {
    name: 'message_id',
    type: dynamodb.AttributeType.STRING,
  },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// Add an LSI to sort messages by timestamp instead of message_id
messagesTable.addLocalSecondaryIndex({
  indexName: 'timestamp-index',
  sortKey: {
    name: 'timestamp',
    type: dynamodb.AttributeType.NUMBER,
  },
  projectionType: dynamodb.ProjectionType.ALL,
});
```

## Provisioned Capacity with Auto-Scaling

For predictable workloads, provisioned capacity with auto-scaling is more cost-effective than on-demand.

```typescript
// Create a table with provisioned capacity
const sessionsTable = new dynamodb.Table(this, 'SessionsTable', {
  tableName: 'Sessions',
  partitionKey: {
    name: 'session_id',
    type: dynamodb.AttributeType.STRING,
  },
  // Start with provisioned capacity
  billingMode: dynamodb.BillingMode.PROVISIONED,
  readCapacity: 100,
  writeCapacity: 50,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// Add auto-scaling for read capacity
// Scale between 100 and 5000 RCU based on utilization
const readScaling = sessionsTable.autoScaleReadCapacity({
  minCapacity: 100,
  maxCapacity: 5000,
});

readScaling.scaleOnUtilization({
  targetUtilizationPercent: 70,
  scaleInCooldown: cdk.Duration.minutes(1),
  scaleOutCooldown: cdk.Duration.minutes(1),
});

// Add auto-scaling for write capacity
const writeScaling = sessionsTable.autoScaleWriteCapacity({
  minCapacity: 50,
  maxCapacity: 2000,
});

writeScaling.scaleOnUtilization({
  targetUtilizationPercent: 70,
  scaleInCooldown: cdk.Duration.minutes(1),
  scaleOutCooldown: cdk.Duration.minutes(1),
});

// Schedule scaling for known traffic patterns
// Scale up before peak hours, scale down after
readScaling.scaleOnSchedule('ScaleUpMorning', {
  schedule: cdk.aws_applicationautoscaling.Schedule.cron({
    hour: '8',
    minute: '0',
  }),
  minCapacity: 500,
});

readScaling.scaleOnSchedule('ScaleDownEvening', {
  schedule: cdk.aws_applicationautoscaling.Schedule.cron({
    hour: '22',
    minute: '0',
  }),
  minCapacity: 100,
});
```

## Enabling Streams and TTL

DynamoDB Streams and TTL are common production requirements.

```typescript
const eventsTable = new dynamodb.Table(this, 'EventsTable', {
  tableName: 'Events',
  partitionKey: {
    name: 'event_id',
    type: dynamodb.AttributeType.STRING,
  },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  // Enable streams to capture changes for event processing
  stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
  // Enable TTL to automatically expire old events
  timeToLiveAttribute: 'expires_at',
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});
```

## Encryption and Tags

Production tables should use encryption and proper tagging.

```typescript
import * as kms from 'aws-cdk-lib/aws-kms';

// Create a KMS key for table encryption
const encryptionKey = new kms.Key(this, 'DynamoDbEncryptionKey', {
  description: 'Encryption key for DynamoDB tables',
  enableKeyRotation: true,
});

const sensitiveTable = new dynamodb.Table(this, 'SensitiveDataTable', {
  tableName: 'SensitiveData',
  partitionKey: {
    name: 'record_id',
    type: dynamodb.AttributeType.STRING,
  },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  // Use customer-managed KMS key for encryption
  encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
  encryptionKey: encryptionKey,
  pointInTimeRecovery: true,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
  contributorInsightsEnabled: true,
});

// Add tags for cost allocation and management
cdk.Tags.of(sensitiveTable).add('Environment', 'production');
cdk.Tags.of(sensitiveTable).add('Team', 'backend');
cdk.Tags.of(sensitiveTable).add('CostCenter', 'engineering');
```

## Granting Permissions to Lambda

CDK makes IAM permissions easy with grant methods.

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';

// Create a Lambda function that reads from the table
const readFunction = new lambda.Function(this, 'ReadFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/read'),
  environment: {
    TABLE_NAME: this.usersTable.tableName,
  },
});

// Grant read-only access - CDK generates the IAM policy automatically
this.usersTable.grantReadData(readFunction);

// Create a Lambda that processes DynamoDB stream events
const streamProcessor = new lambda.Function(this, 'StreamProcessor', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/stream-processor'),
});

// Add the DynamoDB stream as an event source
streamProcessor.addEventSource(new lambdaEventSources.DynamoEventSource(eventsTable, {
  startingPosition: lambda.StartingPosition.LATEST,
  batchSize: 100,
  maxBatchingWindow: cdk.Duration.seconds(5),
  retryAttempts: 3,
}));
```

## Global Tables with CDK

For multi-region replication, use the `TableV2` construct.

```typescript
// Global table with replicas in multiple regions
const globalTable = new dynamodb.TableV2(this, 'GlobalUsersTable', {
  tableName: 'GlobalUsers',
  partitionKey: {
    name: 'user_id',
    type: dynamodb.AttributeType.STRING,
  },
  billing: dynamodb.Billing.onDemand(),
  replicas: [
    { region: 'eu-west-1' },
    { region: 'ap-southeast-1' },
  ],
});
```

## Deploying

Deploy your stack with a single command.

```bash
# Synthesize the CloudFormation template to review it
cdk synth

# Deploy the stack
cdk deploy

# Deploy with approval for security-sensitive changes
cdk deploy --require-approval broadening
```

CDK gives you the best of both worlds - the repeatability of infrastructure as code with the developer experience of a real programming language. For monitoring the tables you create, check out [monitoring DynamoDB with CloudWatch alarms](https://oneuptime.com/blog/post/2026-02-12-monitor-dynamodb-with-cloudwatch-alarms/view) and [enabling DynamoDB Contributor Insights](https://oneuptime.com/blog/post/2026-02-12-enable-dynamodb-contributor-insights/view).
