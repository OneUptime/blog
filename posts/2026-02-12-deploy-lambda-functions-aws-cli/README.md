# How to Deploy Lambda Functions with the AWS CLI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, CLI, Serverless, Deployment

Description: A comprehensive guide to deploying, updating, and managing AWS Lambda functions using the AWS CLI for repeatable, scriptable deployments.

---

The AWS Console is great for getting started, but serious Lambda development needs repeatable deployments. The AWS CLI gives you full control over every aspect of Lambda deployment - creating functions, managing versions, setting up aliases, and configuring triggers. Once you know the commands, you can script your entire deployment pipeline.

Let's go through every step of the Lambda deployment lifecycle using the CLI.

## Setting Up the Execution Role

Every Lambda function needs an IAM role. The role defines what AWS services the function can access.

This creates a minimal role with CloudWatch Logs access:

```bash
# Create the trust policy document
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name lambda-order-processor \
  --assume-role-policy-document file://trust-policy.json

# Attach the basic execution policy
aws iam attach-role-policy \
  --role-name lambda-order-processor \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# If your function needs S3 access, attach that too
aws iam attach-role-policy \
  --role-name lambda-order-processor \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess
```

Wait about 10 seconds after creating the role before creating the function. IAM role propagation isn't instant.

## Packaging Your Code

For simple functions with no external dependencies, a zip file of your source code is all you need.

Here's a Python function to package:

```python
# src/lambda_function.py
import json
import os
import logging

# Set up logging
logger = logging.getLogger()
logger.setLevel(os.environ.get('LOG_LEVEL', 'INFO'))


def lambda_handler(event, context):
    logger.info(f"Processing event: {json.dumps(event)}")

    # Your business logic here
    result = {
        'processed': True,
        'function_version': context.function_version,
        'memory_limit': context.memory_limit_in_mb
    }

    return {
        'statusCode': 200,
        'body': json.dumps(result)
    }
```

Package it up:

```bash
# Create a deployment package from your source directory
cd src && zip -r ../deployment.zip . && cd ..
```

## Creating the Function

With the role and package ready, create the function:

```bash
# Get the role ARN
ROLE_ARN=$(aws iam get-role \
  --role-name lambda-order-processor \
  --query "Role.Arn" --output text)

# Create the function
aws lambda create-function \
  --function-name order-processor \
  --runtime python3.12 \
  --handler lambda_function.lambda_handler \
  --role $ROLE_ARN \
  --zip-file fileb://deployment.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment "Variables={ENVIRONMENT=production,LOG_LEVEL=INFO}" \
  --tags "Project=orders,Team=backend"
```

## Updating Function Code

When you change your code, update just the code without touching the configuration:

```bash
# Rebuild the package
cd src && zip -r ../deployment.zip . && cd ..

# Update the function code
aws lambda update-function-code \
  --function-name order-processor \
  --zip-file fileb://deployment.zip
```

The update is nearly instant. Lambda keeps the old version running until the new one is ready.

## Updating Function Configuration

Change runtime settings without redeploying code:

```bash
# Update memory, timeout, and environment variables
aws lambda update-function-configuration \
  --function-name order-processor \
  --memory-size 512 \
  --timeout 60 \
  --environment "Variables={ENVIRONMENT=production,LOG_LEVEL=DEBUG,DB_HOST=mydb.abc123.us-east-1.rds.amazonaws.com}"
```

Important: `update-function-configuration` replaces ALL environment variables, not just the ones you specify. Always include all variables in the update.

## Publishing Versions

Versions create immutable snapshots of your function. Once published, a version's code and configuration can't be changed.

```bash
# Publish a new version
aws lambda publish-version \
  --function-name order-processor \
  --description "v1.2.0 - Added order validation"
```

This creates a numbered version (1, 2, 3, etc.). You can invoke a specific version by appending it to the function ARN: `arn:aws:lambda:us-east-1:123456789012:function:order-processor:3`.

List all versions:

```bash
# List published versions
aws lambda list-versions-by-function \
  --function-name order-processor \
  --query "Versions[].{Version:Version,Description:Description,LastModified:LastModified}" \
  --output table
```

## Managing Aliases

Aliases are named pointers to specific versions. They let you decouple your triggers from specific version numbers.

```bash
# Create a production alias pointing to version 3
aws lambda create-alias \
  --function-name order-processor \
  --name production \
  --function-version 3 \
  --description "Production traffic"

# Create a staging alias pointing to version 4
aws lambda create-alias \
  --function-name order-processor \
  --name staging \
  --function-version 4
```

When you're ready to promote staging to production:

```bash
# Update the production alias to point to the new version
aws lambda update-alias \
  --function-name order-processor \
  --name production \
  --function-version 4
```

## Canary Deployments with Aliases

You can split traffic between two versions for safe rollouts:

```bash
# Send 90% to version 3, 10% to version 4
aws lambda update-alias \
  --function-name order-processor \
  --name production \
  --function-version 3 \
  --routing-config "AdditionalVersionWeights={\"4\"=0.1}"
```

If version 4 looks good, increase the weight. If it's broken, set it back to zero:

```bash
# Roll back - send all traffic to version 3
aws lambda update-alias \
  --function-name order-processor \
  --name production \
  --function-version 3 \
  --routing-config "AdditionalVersionWeights={}"
```

## Invoking Functions

Test your function from the CLI:

```bash
# Synchronous invocation
aws lambda invoke \
  --function-name order-processor \
  --payload '{"customer_id": "123", "total": 49.99}' \
  --cli-binary-format raw-in-base64-out \
  output.json

# Check the response
cat output.json

# Invoke a specific alias
aws lambda invoke \
  --function-name order-processor \
  --qualifier production \
  --payload '{"test": true}' \
  --cli-binary-format raw-in-base64-out \
  output.json
```

For asynchronous invocation (fire and forget):

```bash
# Async invocation - returns immediately
aws lambda invoke \
  --function-name order-processor \
  --invocation-type Event \
  --payload '{"customer_id": "123"}' \
  --cli-binary-format raw-in-base64-out \
  output.json
```

## Adding Triggers

### API Gateway Trigger

```bash
# Create an HTTP API
API_ID=$(aws apigatewayv2 create-api \
  --name "order-api" \
  --protocol-type HTTP \
  --target "arn:aws:lambda:us-east-1:123456789012:function:order-processor" \
  --query "ApiId" --output text)

# Grant API Gateway permission to invoke the function
aws lambda add-permission \
  --function-name order-processor \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:123456789012:${API_ID}/*"

echo "API URL: https://${API_ID}.execute-api.us-east-1.amazonaws.com/"
```

### S3 Trigger

```bash
# Add permission for S3 to invoke the function
aws lambda add-permission \
  --function-name order-processor \
  --statement-id s3-invoke \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn "arn:aws:s3:::my-orders-bucket" \
  --source-account 123456789012

# Configure S3 to send events to Lambda
aws s3api put-bucket-notification-configuration \
  --bucket my-orders-bucket \
  --notification-configuration '{
    "LambdaFunctionConfigurations": [{
      "LambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789012:function:order-processor",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [
            {"Name": "prefix", "Value": "orders/"},
            {"Name": "suffix", "Value": ".json"}
          ]
        }
      }
    }]
  }'
```

### Scheduled Trigger (EventBridge)

```bash
# Create a rule that runs every 5 minutes
aws events put-rule \
  --name "process-orders-schedule" \
  --schedule-expression "rate(5 minutes)"

# Add the Lambda function as the target
aws events put-targets \
  --rule "process-orders-schedule" \
  --targets "Id=1,Arn=arn:aws:lambda:us-east-1:123456789012:function:order-processor"

# Grant EventBridge permission to invoke the function
aws lambda add-permission \
  --function-name order-processor \
  --statement-id events-invoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:us-east-1:123456789012:rule/process-orders-schedule"
```

## A Complete Deployment Script

Here's a script that handles the full deployment workflow:

```bash
#!/bin/bash
# deploy.sh - Deploy Lambda function with versioning

FUNCTION_NAME="order-processor"
DESCRIPTION="$1"

if [ -z "$DESCRIPTION" ]; then
  echo "Usage: ./deploy.sh 'version description'"
  exit 1
fi

echo "Building deployment package..."
cd src && zip -r ../deployment.zip . && cd ..

echo "Updating function code..."
aws lambda update-function-code \
  --function-name $FUNCTION_NAME \
  --zip-file fileb://deployment.zip

# Wait for the update to complete
echo "Waiting for function update..."
aws lambda wait function-updated --function-name $FUNCTION_NAME

echo "Publishing new version..."
VERSION=$(aws lambda publish-version \
  --function-name $FUNCTION_NAME \
  --description "$DESCRIPTION" \
  --query "Version" --output text)

echo "Published version: $VERSION"

echo "Updating staging alias..."
aws lambda update-alias \
  --function-name $FUNCTION_NAME \
  --name staging \
  --function-version $VERSION

echo "Deployment complete. Run tests against the staging alias."
echo "To promote to production: aws lambda update-alias --function-name $FUNCTION_NAME --name production --function-version $VERSION"
```

## Wrapping Up

The AWS CLI gives you everything you need for professional Lambda deployments. Version management, aliases, canary deployments, and trigger configuration are all available through simple commands that you can script and automate.

For even more streamlined deployments, consider [AWS SAM](https://oneuptime.com/blog/post/2026-02-12-deploy-lambda-functions-aws-sam/view), which wraps these CLI operations in a higher-level framework. And if your functions have external dependencies, check out our guide on [packaging Lambda functions with dependencies](https://oneuptime.com/blog/post/2026-02-12-package-lambda-functions-dependencies/view).
