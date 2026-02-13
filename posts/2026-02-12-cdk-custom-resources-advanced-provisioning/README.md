# How to Use CDK Custom Resources for Advanced Provisioning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Custom Resources, Lambda

Description: Learn how to use AWS CDK custom resources to provision infrastructure that CloudFormation doesn't natively support, with practical examples and error handling patterns.

---

CDK is great, but it can't do everything. Sometimes you need to call an API that CloudFormation doesn't support, run a database migration after an RDS instance is created, or configure a third-party service during deployment. That's where custom resources come in. They let you run arbitrary code during CloudFormation stack operations - create, update, and delete.

CDK provides two levels of abstraction for custom resources: `AwsCustomResource` for simple AWS API calls and `Provider` for full Lambda-backed custom resources. Let's explore both.

## AwsCustomResource for Simple API Calls

The easiest custom resource is `AwsCustomResource`. It calls an AWS API directly without you needing to write any Lambda code:

```typescript
// lib/custom-resources-stack.ts - AWS SDK call as a custom resource
import * as cdk from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class CustomResourcesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Example: Enable S3 Transfer Acceleration on a bucket
    // (not natively supported by CloudFormation)
    const enableTransferAcceleration = new cr.AwsCustomResource(
      this, 'EnableTransferAcceleration', {
        onCreate: {
          service: 'S3',
          action: 'putBucketAccelerateConfiguration',
          parameters: {
            Bucket: 'my-data-bucket',
            AccelerateConfiguration: {
              Status: 'Enabled',
            },
          },
          physicalResourceId: cr.PhysicalResourceId.of('transfer-accel'),
        },
        onDelete: {
          service: 'S3',
          action: 'putBucketAccelerateConfiguration',
          parameters: {
            Bucket: 'my-data-bucket',
            AccelerateConfiguration: {
              Status: 'Suspended',
            },
          },
        },
        policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
          resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
        }),
      }
    );
  }
}
```

The `AwsCustomResource` handles the Lambda function, permissions, and CloudFormation response for you. You just specify the AWS SDK calls for create, update, and delete operations.

## Reading Data with AwsCustomResource

You can also use custom resources to read data and pass it to other constructs:

```typescript
// Fetch the latest AMI ID using a custom resource
const latestAmi = new cr.AwsCustomResource(this, 'LatestAmi', {
  onCreate: {
    service: 'EC2',
    action: 'describeImages',
    parameters: {
      Owners: ['amazon'],
      Filters: [
        { Name: 'name', Values: ['amzn2-ami-hvm-*-x86_64-gp2'] },
        { Name: 'state', Values: ['available'] },
      ],
    },
    physicalResourceId: cr.PhysicalResourceId.of('latest-ami-lookup'),
  },
  policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
    resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
  }),
});

// Use the result in another resource
const amiId = latestAmi.getResponseField('Images.0.ImageId');
```

The `getResponseField` method extracts values from the API response using dot notation. This is really useful for bridging gaps where CDK doesn't have a built-in lookup.

## Full Custom Resource with Provider Framework

For complex logic that requires actual code, use the Provider framework:

```typescript
// Custom resource with full Lambda handler
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

// The Lambda function that implements the custom resource logic
const onEventHandler = new lambda.Function(this, 'OnEventHandler', {
  runtime: lambda.Runtime.PYTHON_3_12,
  handler: 'index.on_event',
  code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/custom-resource')),
  timeout: cdk.Duration.minutes(5),
});

// Optional: separate function for async operations
const isCompleteHandler = new lambda.Function(this, 'IsCompleteHandler', {
  runtime: lambda.Runtime.PYTHON_3_12,
  handler: 'index.is_complete',
  code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/custom-resource')),
  timeout: cdk.Duration.seconds(30),
});

// Create the provider
const provider = new cr.Provider(this, 'CustomProvider', {
  onEventHandler: onEventHandler,
  isCompleteHandler: isCompleteHandler, // Optional: for async operations
  queryInterval: cdk.Duration.seconds(10),
  totalTimeout: cdk.Duration.minutes(30),
});

// Use the provider in a custom resource
const customResource = new cdk.CustomResource(this, 'MyCustomResource', {
  serviceToken: provider.serviceToken,
  properties: {
    DatabaseName: 'myapp',
    SchemaVersion: '3',
  },
});
```

Here's the corresponding Lambda handler:

```python
# lambda/custom-resource/index.py - Custom resource handler
import json
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def on_event(event, context):
    """Handle create, update, and delete events."""
    logger.info(f"Received event: {json.dumps(event)}")

    request_type = event['RequestType']
    properties = event['ResourceProperties']

    if request_type == 'Create':
        return on_create(properties)
    elif request_type == 'Update':
        return on_update(event, properties)
    elif request_type == 'Delete':
        return on_delete(event, properties)
    else:
        raise ValueError(f"Unknown request type: {request_type}")

def on_create(properties):
    """Run database migration on stack creation."""
    db_name = properties['DatabaseName']
    schema_version = properties['SchemaVersion']

    # Run your migration logic here
    logger.info(f"Running migration to version {schema_version} on {db_name}")

    return {
        'PhysicalResourceId': f'migration-{db_name}-v{schema_version}',
        'Data': {
            'MigrationStatus': 'completed',
            'SchemaVersion': schema_version,
        }
    }

def on_update(event, properties):
    """Run migration on stack update if schema version changed."""
    old_properties = event.get('OldResourceProperties', {})
    new_version = properties['SchemaVersion']
    old_version = old_properties.get('SchemaVersion', '0')

    if new_version != old_version:
        logger.info(f"Migrating from v{old_version} to v{new_version}")
        # Run migration logic

    return {
        'PhysicalResourceId': event['PhysicalResourceId'],
        'Data': {
            'MigrationStatus': 'completed',
            'SchemaVersion': new_version,
        }
    }

def on_delete(event, properties):
    """Clean up on stack deletion."""
    logger.info("Stack deletion - cleaning up")
    # Optional cleanup logic
    return {
        'PhysicalResourceId': event['PhysicalResourceId'],
    }

def is_complete(event, context):
    """Check if async operation is complete."""
    # For long-running operations, check status here
    return {
        'IsComplete': True,
        'Data': {'Status': 'ready'}
    }
```

## The isComplete Pattern for Long Operations

Some operations take longer than Lambda's 15-minute timeout. The `isCompleteHandler` solves this by letting the provider poll periodically:

```typescript
// Provider with async polling for long-running operations
const provider = new cr.Provider(this, 'AsyncProvider', {
  onEventHandler: startOperationFn,
  isCompleteHandler: checkStatusFn,
  queryInterval: cdk.Duration.seconds(30), // Poll every 30 seconds
  totalTimeout: cdk.Duration.hours(2),     // Give up after 2 hours
});
```

The flow goes like this: `onEventHandler` starts the operation and returns immediately. The provider then calls `isCompleteHandler` every `queryInterval` until it returns `{ IsComplete: true }` or the timeout expires.

## Error Handling

Proper error handling in custom resources is critical. If your Lambda throws an unhandled exception, CloudFormation will wait for an hour before timing out:

```python
# Robust error handling in custom resource handlers
def on_event(event, context):
    try:
        request_type = event['RequestType']

        if request_type == 'Create':
            return on_create(event['ResourceProperties'])
        elif request_type == 'Update':
            return on_update(event)
        elif request_type == 'Delete':
            # Never fail on delete - it blocks stack deletion
            try:
                return on_delete(event)
            except Exception as e:
                logger.error(f"Delete failed but continuing: {e}")
                return {'PhysicalResourceId': event['PhysicalResourceId']}

    except Exception as e:
        logger.error(f"Custom resource failed: {e}")
        raise  # Provider framework handles sending failure response
```

The key insight: never let the delete handler fail. If delete fails, CloudFormation can't clean up the stack, and you end up with a stuck stack that requires manual intervention.

## Passing Data Back to CDK

Custom resources can return data that other CDK constructs consume:

```typescript
// Access custom resource outputs in CDK
const dbSetup = new cdk.CustomResource(this, 'DatabaseSetup', {
  serviceToken: provider.serviceToken,
  properties: {
    DatabaseName: 'myapp',
  },
});

// Use the returned data
const connectionString = dbSetup.getAttString('ConnectionString');
const schemaVersion = dbSetup.getAttString('SchemaVersion');

// Pass to another resource
new lambda.Function(this, 'AppFunction', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/app'),
  environment: {
    DB_CONNECTION: connectionString,
    SCHEMA_VERSION: schemaVersion,
  },
});
```

The `Data` field in your Lambda's return value becomes accessible through `getAttString` and `getAtt` in CDK.

## Common Use Cases

Custom resources are most useful for:

- **Database migrations** after RDS creation
- **Seed data** insertion into DynamoDB tables
- **Third-party API calls** during deployment (Datadog, PagerDuty configuration)
- **DNS records** in external providers
- **Pre-deployment validation** (checking prerequisites)
- **Post-deployment smoke tests**

For post-deployment actions specifically, CDK also offers [triggers](https://oneuptime.com/blog/post/2026-02-12-cdk-triggers-post-deployment-actions/view) which are a simpler alternative for some use cases.

## Wrapping Up

Custom resources are CDK's escape hatch for when CloudFormation falls short. `AwsCustomResource` handles simple API calls without any Lambda code, while the Provider framework gives you full control for complex operations. The most important thing to remember: always handle errors gracefully, never fail on delete, and set appropriate timeouts. With these patterns, there's virtually no infrastructure provisioning task that CDK can't handle.
