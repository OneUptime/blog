# How to Use CDK Triggers for Post-Deployment Actions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CDK, Triggers, Lambda, Deployment

Description: Use AWS CDK Triggers to run Lambda functions after deployment for tasks like database migrations, cache warming, health checks, and integration tests.

---

There's a common need in infrastructure deployments that CloudFormation doesn't handle well: running code after resources are created. You might need to run a database migration after RDS spins up, warm a cache after ElastiCache is ready, or run a health check after deploying a new API. CDK Triggers were built specifically for this. They're simpler than custom resources and more purpose-built for post-deployment tasks.

## What Are CDK Triggers?

A CDK Trigger is a construct that executes a Lambda function after specific resources in your stack have been created or updated. Unlike custom resources, triggers don't create CloudFormation resources - they just run code at the right time.

Here's the basic pattern:

```typescript
// lib/triggers-stack.ts - CDK Triggers for post-deployment actions
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as triggers from 'aws-cdk-lib/triggers';
import { Construct } from 'constructs';

export class TriggersStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function that runs after deployment
    const migrationFn = new lambda.Function(this, 'MigrationFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/migration'),
      timeout: cdk.Duration.minutes(5),
      functionName: 'db-migration',
    });

    // Trigger runs the Lambda after the stack deploys
    new triggers.Trigger(this, 'MigrationTrigger', {
      handler: migrationFn,
      timeout: cdk.Duration.minutes(10),
      invocationType: triggers.InvocationType.REQUEST_RESPONSE,
    });
  }
}
```

The trigger ensures the Lambda function runs every time the stack is deployed. If the function fails, the deployment fails too, so you get immediate feedback.

## Running After Specific Resources

The real power comes from specifying dependencies. You can make a trigger run only after certain resources are ready:

```typescript
// Trigger that depends on specific resources
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

const vpc = new ec2.Vpc(this, 'VPC');

const database = new rds.DatabaseInstance(this, 'Database', {
  engine: rds.DatabaseInstanceEngine.postgres({
    version: rds.PostgresEngineVersion.VER_15_4,
  }),
  instanceType: ec2.InstanceType.of(
    ec2.InstanceClass.T3,
    ec2.InstanceSize.MEDIUM
  ),
  vpc: vpc,
  databaseName: 'myapp',
});

// Migration Lambda that connects to the database
const migrationFn = new lambda.Function(this, 'MigrationFn', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/migration'),
  vpc: vpc,
  timeout: cdk.Duration.minutes(10),
  environment: {
    DB_HOST: database.dbInstanceEndpointAddress,
    DB_PORT: database.dbInstanceEndpointPort,
    DB_NAME: 'myapp',
  },
});

// Only run after the database is ready
const trigger = new triggers.Trigger(this, 'DbMigration', {
  handler: migrationFn,
  timeout: cdk.Duration.minutes(15),
});

// Make the trigger wait for the database
trigger.executeAfter(database);
```

The `executeAfter` method adds a CloudFormation dependency, ensuring the database is fully provisioned before the migration runs.

## TriggerFunction - The Shortcut

If you don't need to reuse the Lambda function elsewhere, `TriggerFunction` combines the function and trigger into one construct:

```typescript
// TriggerFunction combines Lambda creation and trigger execution
const healthCheck = new triggers.TriggerFunction(this, 'HealthCheck', {
  runtime: lambda.Runtime.PYTHON_3_12,
  handler: 'index.handler',
  code: lambda.Code.fromInline(`
import urllib.request
import json
import os

def handler(event, context):
    url = os.environ['API_URL'] + '/health'
    try:
        req = urllib.request.Request(url)
        response = urllib.request.urlopen(req, timeout=10)
        data = json.loads(response.read())

        if data.get('status') != 'healthy':
            raise Exception(f"Health check failed: {data}")

        print(f"Health check passed: {data}")
        return {'statusCode': 200}
    except Exception as e:
        print(f"Health check failed: {e}")
        raise
  `),
  timeout: cdk.Duration.seconds(30),
  environment: {
    API_URL: 'https://api.example.com',
  },
});

healthCheck.executeAfter(apiGateway);
```

## Cache Warming Example

After deploying a new ElastiCache cluster or invalidating a CloudFront distribution, you might want to pre-populate the cache:

```typescript
// Cache warming trigger after ElastiCache deployment
import * as elasticache from 'aws-cdk-lib/aws-elasticache';

const cacheWarmer = new lambda.Function(this, 'CacheWarmer', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/cache-warmer'),
  vpc: vpc,
  timeout: cdk.Duration.minutes(5),
  environment: {
    REDIS_HOST: cacheCluster.attrRedisEndpointAddress,
    REDIS_PORT: cacheCluster.attrRedisEndpointPort,
  },
  memorySize: 1024,
});

const warmTrigger = new triggers.Trigger(this, 'WarmCache', {
  handler: cacheWarmer,
  timeout: cdk.Duration.minutes(10),
});

warmTrigger.executeAfter(cacheCluster);
```

The Lambda handler for cache warming might look like this:

```typescript
// lambda/cache-warmer/index.ts - Pre-populate Redis cache
import { createClient } from 'redis';

export const handler = async () => {
  const client = createClient({
    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
  });

  await client.connect();

  // Pre-compute and cache frequently accessed data
  const popularProducts = await fetchPopularProducts();
  for (const product of popularProducts) {
    await client.set(
      `product:${product.id}`,
      JSON.stringify(product),
      { EX: 3600 } // 1 hour TTL
    );
  }

  const categories = await fetchCategories();
  await client.set('categories', JSON.stringify(categories), { EX: 86400 });

  console.log(`Warmed ${popularProducts.length} products and ${categories.length} categories`);
  await client.disconnect();

  return { statusCode: 200, warmed: popularProducts.length };
};
```

## Running Integration Tests

Triggers are perfect for post-deployment smoke tests:

```typescript
// Integration test trigger
const integrationTest = new triggers.TriggerFunction(this, 'IntegrationTest', {
  runtime: lambda.Runtime.PYTHON_3_12,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/integration-tests'),
  timeout: cdk.Duration.minutes(5),
  environment: {
    API_ENDPOINT: apiGateway.url,
    EXPECTED_VERSION: '2.1.0',
  },
});

// Run after API Gateway and all its Lambda integrations
integrationTest.executeAfter(apiGateway);
integrationTest.executeAfter(handlerFunction);
integrationTest.executeAfter(authFunction);
```

The integration test Lambda:

```python
# lambda/integration-tests/index.py - Post-deployment smoke tests
import urllib.request
import json
import os

def handler(event, context):
    api = os.environ['API_ENDPOINT']
    expected_version = os.environ['EXPECTED_VERSION']
    failures = []

    # Test 1: Health endpoint
    try:
        resp = urllib.request.urlopen(f"{api}/health", timeout=10)
        data = json.loads(resp.read())
        assert data['status'] == 'ok', f"Health check returned: {data['status']}"
        print("PASS: Health endpoint")
    except Exception as e:
        failures.append(f"Health check failed: {e}")

    # Test 2: Version endpoint
    try:
        resp = urllib.request.urlopen(f"{api}/version", timeout=10)
        data = json.loads(resp.read())
        assert data['version'] == expected_version
        print(f"PASS: Version is {expected_version}")
    except Exception as e:
        failures.append(f"Version check failed: {e}")

    # Test 3: Auth flow
    try:
        req = urllib.request.Request(
            f"{api}/protected",
            headers={'Authorization': 'Bearer test-token'}
        )
        resp = urllib.request.urlopen(req, timeout=10)
        assert resp.getcode() == 200
        print("PASS: Auth flow working")
    except Exception as e:
        failures.append(f"Auth test failed: {e}")

    if failures:
        error_msg = "\n".join(failures)
        raise Exception(f"Integration tests failed:\n{error_msg}")

    return {'statusCode': 200, 'tests_passed': 3}
```

## Seed Data Insertion

Populate a DynamoDB table with initial data after creation:

```typescript
// Seed DynamoDB table after creation
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

const settingsTable = new dynamodb.Table(this, 'SettingsTable', {
  tableName: 'app-settings',
  partitionKey: { name: 'key', type: dynamodb.AttributeType.STRING },
});

const seedFn = new lambda.Function(this, 'SeedData', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda/seed'),
  environment: {
    TABLE_NAME: settingsTable.tableName,
  },
});

settingsTable.grantWriteData(seedFn);

const seedTrigger = new triggers.Trigger(this, 'SeedTrigger', {
  handler: seedFn,
});

seedTrigger.executeAfter(settingsTable);
```

## Triggers vs Custom Resources

When should you use triggers instead of custom resources?

**Use triggers when**:
- You need to run code after deployment
- The action doesn't create a "resource" that needs cleanup
- You want deployment to fail if the action fails
- You're running migrations, health checks, or seed data

**Use custom resources when**:
- You need create/update/delete lifecycle management
- The action provisions something outside CloudFormation
- You need to return data to other CDK constructs
- You need cleanup on stack deletion

For custom resources, check out our post on [CDK custom resources for advanced provisioning](https://oneuptime.com/blog/post/2026-02-12-cdk-custom-resources-advanced-provisioning/view).

## Wrapping Up

CDK Triggers fill a gap that's existed in CloudFormation since forever - running code after resources are deployed. They're simpler than custom resources, more predictable, and perfect for the most common post-deployment tasks. Start with health checks and database migrations, and you'll quickly find more use cases. The `executeAfter` method is the key - it makes sure your code only runs when the resources it depends on are actually ready.
