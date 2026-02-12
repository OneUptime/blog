# How to Create a DynamoDB Table with CDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, DynamoDB, Database

Description: Complete guide to creating and configuring DynamoDB tables using AWS CDK, covering partition keys, sort keys, GSIs, LSIs, auto-scaling, and TTL.

---

DynamoDB is AWS's go-to NoSQL database when you need single-digit millisecond latency at any scale. But configuring it correctly - choosing the right key schema, capacity mode, indexes, and scaling policies - takes some thought. CDK lets you define all of this in TypeScript, making it easy to iterate on your data model and deploy consistently.

This guide covers everything from a basic table to advanced patterns with global secondary indexes, local secondary indexes, streams, and TTL configuration.

## Choosing Your Capacity Mode

Before writing any code, you need to decide between on-demand and provisioned capacity.

On-demand is simpler - you pay per request and AWS handles scaling automatically. It's great for unpredictable workloads or when you're just starting out and don't know your traffic patterns yet.

Provisioned gives you more control and can be cheaper for predictable, steady workloads. You set read and write capacity units, and auto-scaling adjusts them within your defined bounds.

For most new projects, start with on-demand and switch to provisioned once you understand your access patterns.

## Project Setup

```bash
# Create a new CDK project
mkdir dynamodb-cdk && cd dynamodb-cdk
cdk init app --language typescript
npm install aws-cdk-lib constructs
```

## Basic Table Definition

Open `lib/dynamodb-stack.ts` and define a simple table.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DynamoDbStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a basic DynamoDB table with on-demand billing
    const table = new dynamodb.Table(this, 'ItemsTable', {
      tableName: 'Items',
      partitionKey: {
        name: 'pk',                          // Partition key
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',                          // Sort key for range queries
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand
      removalPolicy: cdk.RemovalPolicy.RETAIN,           // Don't delete data on stack removal
      pointInTimeRecovery: true,                          // Enable PITR for backups
    });
  }
}
```

A few important decisions here. We're using generic key names (`pk` and `sk`) because this is the single-table design pattern. If you're doing one table per entity, use descriptive names like `userId` or `orderId` instead.

The `removalPolicy` is set to `RETAIN` - that means when you delete the CDK stack, the table and its data stick around. For production databases, this is almost always what you want. You don't want a `cdk destroy` to wipe out your data.

## Adding Global Secondary Indexes

Global secondary indexes (GSIs) let you query your data using different key combinations than the base table. They're essential for access patterns that don't align with your primary key.

```typescript
// Add a GSI for querying items by status and creation date
table.addGlobalSecondaryIndex({
  indexName: 'StatusDateIndex',
  partitionKey: {
    name: 'status',
    type: dynamodb.AttributeType.STRING,
  },
  sortKey: {
    name: 'createdAt',
    type: dynamodb.AttributeType.STRING,
  },
  // Project all attributes to the index (costs more storage, but
  // avoids the need to fetch from the base table)
  projectionType: dynamodb.ProjectionType.ALL,
});

// Add another GSI for querying by email
table.addGlobalSecondaryIndex({
  indexName: 'EmailIndex',
  partitionKey: {
    name: 'email',
    type: dynamodb.AttributeType.STRING,
  },
  projectionType: dynamodb.ProjectionType.KEYS_ONLY, // Only project keys to save cost
});
```

Each GSI adds cost because DynamoDB replicates data to the index. Use `KEYS_ONLY` or `INCLUDE` projection when you don't need all attributes in the index.

## Adding Local Secondary Indexes

Local secondary indexes (LSIs) share the same partition key as the base table but use a different sort key. They must be defined at table creation time - you can't add them later.

```typescript
// LSIs must be defined at table creation, not added later
const tableWithLSI = new dynamodb.Table(this, 'OrdersTable', {
  tableName: 'Orders',
  partitionKey: {
    name: 'customerId',
    type: dynamodb.AttributeType.STRING,
  },
  sortKey: {
    name: 'orderId',
    type: dynamodb.AttributeType.STRING,
  },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// Add LSI - same partition key (customerId), different sort key
tableWithLSI.addLocalSecondaryIndex({
  indexName: 'CustomerDateIndex',
  sortKey: {
    name: 'orderDate',
    type: dynamodb.AttributeType.STRING,
  },
  projectionType: dynamodb.ProjectionType.ALL,
});
```

## Provisioned Capacity with Auto-Scaling

If you switch to provisioned capacity, you'll want auto-scaling to handle traffic variations.

```typescript
// Create a table with provisioned capacity
const provisionedTable = new dynamodb.Table(this, 'HighTrafficTable', {
  tableName: 'HighTraffic',
  partitionKey: {
    name: 'id',
    type: dynamodb.AttributeType.STRING,
  },
  billingMode: dynamodb.BillingMode.PROVISIONED,
  readCapacity: 10,   // Starting read capacity units
  writeCapacity: 10,  // Starting write capacity units
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});

// Configure auto-scaling for read capacity
const readScaling = provisionedTable.autoScaleReadCapacity({
  minCapacity: 5,
  maxCapacity: 100,
});

readScaling.scaleOnUtilization({
  targetUtilizationPercent: 70, // Scale when utilization hits 70%
});

// Configure auto-scaling for write capacity
const writeScaling = provisionedTable.autoScaleWriteCapacity({
  minCapacity: 5,
  maxCapacity: 100,
});

writeScaling.scaleOnUtilization({
  targetUtilizationPercent: 70,
});
```

## Enabling DynamoDB Streams

Streams let you react to changes in your table - perfect for triggering Lambda functions, updating search indexes, or replicating data.

```typescript
// Enable DynamoDB Streams to capture changes
const streamTable = new dynamodb.Table(this, 'StreamTable', {
  tableName: 'StreamEnabled',
  partitionKey: {
    name: 'id',
    type: dynamodb.AttributeType.STRING,
  },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES, // Capture before and after
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});
```

`NEW_AND_OLD_IMAGES` gives you both the old and new versions of the item on each change, which is the most flexible option.

## Configuring TTL

Time-to-live automatically deletes expired items, which is great for session data, caches, or temporary records.

```typescript
// Enable TTL - items with an expired 'ttl' attribute get deleted automatically
const ttlTable = new dynamodb.Table(this, 'SessionTable', {
  tableName: 'Sessions',
  partitionKey: {
    name: 'sessionId',
    type: dynamodb.AttributeType.STRING,
  },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  timeToLiveAttribute: 'expiresAt', // Unix timestamp field for TTL
  removalPolicy: cdk.RemovalPolicy.RETAIN,
});
```

The TTL attribute must contain a Unix epoch timestamp (in seconds). DynamoDB checks periodically and deletes items past their expiration. Note that deletion isn't instant - it can take up to 48 hours, though it's usually much faster.

## Granting Permissions

CDK makes IAM permissions easy with grant methods.

```typescript
// Grant a Lambda function read/write access to the table
// listItemsHandler.grantReadData(table);   // Read only
// createItemHandler.grantWriteData(table);  // Write only
// adminHandler.grantReadWriteData(table);   // Full access
```

These grant methods create minimal IAM policies automatically - no hand-crafting policy documents needed.

## Stack Outputs

```typescript
// Output the table name and ARN for reference
new cdk.CfnOutput(this, 'TableName', {
  value: table.tableName,
});

new cdk.CfnOutput(this, 'TableArn', {
  value: table.tableArn,
});
```

## Deploying

```bash
# Preview changes
cdk diff

# Deploy
cdk deploy
```

## Tips for Production

Keep your partition keys well-distributed. Hot partitions are the number one cause of DynamoDB performance problems. If all your traffic hits the same partition key, you'll get throttled regardless of your capacity settings.

Use the single-table design pattern when it makes sense, but don't force it. For simple applications with clear entity boundaries, separate tables are perfectly fine and easier to reason about.

Always enable point-in-time recovery for production tables. The cost is minimal, and it's saved many teams from data loss disasters.

Monitor your table with CloudWatch metrics. Watch for throttled requests, consumed capacity approaching provisioned capacity, and system errors. A monitoring tool like [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) can alert you before users notice problems.

## Wrapping Up

CDK gives you a clean way to define DynamoDB tables with all their configuration in code. Start with on-demand billing, add indexes as your access patterns become clear, and switch to provisioned capacity with auto-scaling once your traffic is predictable. The key is getting your data model right first - the CDK code is the easy part.

For a complete serverless backend, pair this with our guide on [creating an API Gateway with CDK](https://oneuptime.com/blog/post/create-api-gateway-with-cdk/view).
