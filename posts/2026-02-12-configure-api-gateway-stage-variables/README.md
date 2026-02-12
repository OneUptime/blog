# How to Configure API Gateway Stage Variables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, API Gateway, Serverless, DevOps

Description: Learn how to use API Gateway stage variables to manage environment-specific configurations across dev, staging, and production stages without changing your API definition.

---

When you're running the same API across multiple environments - dev, staging, production - you don't want to maintain separate API definitions for each one. Stage variables solve this by letting you define key-value pairs at the stage level that you can reference throughout your API configuration. Think of them as environment variables for your API Gateway stages.

They're useful for pointing different stages at different Lambda functions, DynamoDB tables, or external endpoints without touching the API definition itself. Let's see how to put them to work.

## What Are Stage Variables?

Stage variables are name-value pairs associated with a specific deployment stage of your API. You can reference them in:

- Lambda function ARNs (to call different function versions per stage)
- HTTP endpoint URLs
- Parameter mapping templates
- Lambda authorizer configurations

The syntax for referencing a stage variable is `${stageVariables.variableName}`.

## Creating Stage Variables via Console and CLI

The quickest way to create stage variables is through the AWS CLI.

These commands create stage variables for different environments:

```bash
# Set the Lambda function alias for the prod stage
aws apigateway update-stage \
  --rest-api-id a1b2c3d4e5 \
  --stage-name prod \
  --patch-operations \
    op=replace,path=/variables/lambdaAlias,value=prod \
    op=replace,path=/variables/tableName,value=orders-prod \
    op=replace,path=/variables/logLevel,value=WARN

# Set the Lambda function alias for the dev stage
aws apigateway update-stage \
  --rest-api-id a1b2c3d4e5 \
  --stage-name dev \
  --patch-operations \
    op=replace,path=/variables/lambdaAlias,value=dev \
    op=replace,path=/variables/tableName,value=orders-dev \
    op=replace,path=/variables/logLevel,value=DEBUG
```

To verify your stage variables:

```bash
# List all variables for a stage
aws apigateway get-stage \
  --rest-api-id a1b2c3d4e5 \
  --stage-name prod \
  --query 'variables'
```

## Using Stage Variables with Lambda Functions

The most powerful use case is pointing different stages at different Lambda function aliases or versions. Instead of hardcoding a Lambda ARN in your integration, you use a stage variable.

In your API Gateway integration, set the Lambda function URI to:

```
arn:aws:lambda:us-east-1:123456789012:function:order-processor:${stageVariables.lambdaAlias}
```

When a request hits the `prod` stage, API Gateway resolves this to `order-processor:prod`. When it hits `dev`, it resolves to `order-processor:dev`.

But there's a catch - you need to grant API Gateway permission to invoke each Lambda alias separately.

This script adds the necessary permissions for each alias:

```bash
# Grant API Gateway permission to invoke the prod alias
aws lambda add-permission \
  --function-name "arn:aws:lambda:us-east-1:123456789012:function:order-processor:prod" \
  --statement-id apigateway-prod \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:123456789012:a1b2c3d4e5/*/GET/orders"

# Grant API Gateway permission to invoke the dev alias
aws lambda add-permission \
  --function-name "arn:aws:lambda:us-east-1:123456789012:function:order-processor:dev" \
  --statement-id apigateway-dev \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:123456789012:a1b2c3d4e5/*/GET/orders"
```

## Setting Up with AWS CDK

CDK gives you a clean way to define stage variables alongside your API deployment.

This CDK stack creates an API with multiple stages, each having their own variables:

```typescript
import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class StageVariablesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const handler = new lambda.Function(this, 'Handler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/api'),
    });

    // Create Lambda aliases
    const devAlias = new lambda.Alias(this, 'DevAlias', {
      aliasName: 'dev',
      version: handler.currentVersion,
    });

    const prodAlias = new lambda.Alias(this, 'ProdAlias', {
      aliasName: 'prod',
      version: handler.currentVersion,
    });

    // Create the API with a prod deployment
    const api = new apigateway.RestApi(this, 'OrdersApi', {
      restApiName: 'Orders Service',
      deploy: true,
      deployOptions: {
        stageName: 'prod',
        variables: {
          lambdaAlias: 'prod',
          tableName: 'orders-prod',
          logLevel: 'WARN',
        },
      },
    });

    // Add a method with Lambda integration
    const orders = api.root.addResource('orders');
    orders.addMethod('GET', new apigateway.LambdaIntegration(handler));

    // Create a dev stage with different variables
    const devStage = new apigateway.Stage(this, 'DevStage', {
      deployment: api.latestDeployment!,
      stageName: 'dev',
      variables: {
        lambdaAlias: 'dev',
        tableName: 'orders-dev',
        logLevel: 'DEBUG',
      },
    });
  }
}
```

## Accessing Stage Variables in Lambda

Your Lambda function can access stage variables through the request context. When using proxy integration, they're in `event.requestContext.stage` and `event.stageVariables`.

This Lambda handler uses stage variables to determine the environment:

```javascript
exports.handler = async (event) => {
  // Access stage variables directly
  const stageVars = event.stageVariables || {};

  const tableName = stageVars.tableName || 'orders-default';
  const logLevel = stageVars.logLevel || 'INFO';

  // Use the current stage name
  const stage = event.requestContext.stage;

  console.log(`Running in ${stage} stage, table: ${tableName}, log level: ${logLevel}`);

  // Use stage variable to configure DynamoDB table
  const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
  const client = new DynamoDBClient({});

  const result = await client.send(new ScanCommand({
    TableName: tableName,
    Limit: 10,
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stage: stage,
      items: result.Items,
    }),
  };
};
```

## Using Stage Variables for HTTP Proxy Endpoints

Stage variables aren't just for Lambda. You can use them for HTTP proxy integrations too, pointing different stages at different backend URLs.

Set the integration endpoint URL to:

```
https://${stageVariables.backendHost}/api/v1/orders
```

Then configure the stage variables:

```bash
# Dev stage points to development backend
aws apigateway update-stage \
  --rest-api-id a1b2c3d4e5 \
  --stage-name dev \
  --patch-operations op=replace,path=/variables/backendHost,value=dev-api.internal.example.com

# Prod stage points to production backend
aws apigateway update-stage \
  --rest-api-id a1b2c3d4e5 \
  --stage-name prod \
  --patch-operations op=replace,path=/variables/backendHost,value=api.internal.example.com
```

This pattern works well when API Gateway fronts a fleet of EC2 instances, ECS services, or any HTTP-based backend. For private backends, you might want to combine this with [API Gateway VPC Link for private APIs](https://oneuptime.com/blog/post/api-gateway-vpc-link-private-apis/view).

## Stage Variables in Mapping Templates

If you're using non-proxy integration (custom integration), you can reference stage variables in your mapping templates.

This Velocity template uses a stage variable in the request mapping:

```velocity
#set($tableName = $stageVariables.tableName)
{
  "TableName": "$tableName",
  "Key": {
    "orderId": {
      "S": "$input.params('orderId')"
    }
  }
}
```

## Common Patterns and Best Practices

**Use with Lambda aliases for safe deployments.** Create a Lambda alias for each stage and use stage variables to route traffic. When you deploy a new version, update the alias - not the stage variable. This gives you instant rollback capability.

**Combine with canary deployments.** API Gateway supports canary releases at the stage level. You can gradually shift traffic to a new deployment while stage variables remain consistent.

**Keep variable names consistent across stages.** Use the same variable names in every stage - just change the values. This prevents hard-to-debug issues where a variable exists in prod but not in dev.

**Don't store secrets in stage variables.** Stage variables are visible in the API Gateway console and CLI. Use AWS Secrets Manager or Parameter Store for sensitive values, and use stage variables to store the secret name or parameter path.

```javascript
// Instead of putting the secret value in a stage variable...
// Use the stage variable to store the secret name
const secretName = stageVars.secretName; // e.g., "prod/api/database-password"
// Then fetch from Secrets Manager
```

## Limitations to Know About

- Stage variables are limited to alphanumeric characters, hyphens, underscores, and periods
- Maximum of 128 stage variables per stage
- Each variable value can be up to 512 characters
- Stage variables can't be used in all integration properties - check the AWS docs for specifics
- HTTP APIs (v2) have limited stage variable support compared to REST APIs

## Wrapping Up

Stage variables are a simple but effective tool for managing multi-environment API deployments. They let you keep a single API definition while varying behavior across stages. Combined with Lambda aliases, they give you a clean deployment pipeline from dev to production. If you're managing multiple stages of the same API, you should be using them.
