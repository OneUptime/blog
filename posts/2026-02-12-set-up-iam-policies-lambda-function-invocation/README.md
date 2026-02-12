# How to Set Up IAM Policies for Lambda Function Invocation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, IAM, Lambda, Security

Description: Learn how to create IAM policies for Lambda function invocation, including execution roles, cross-account access, event source permissions, and resource-based policies.

---

Lambda functions have two sides to their IAM story. There's the execution role (what the function can do when it runs) and the invocation permissions (who can trigger the function). Getting both right is essential for secure serverless architectures. A misconfigured execution role can give a function access to resources it shouldn't touch, and overly permissive invocation settings can let unauthorized callers trigger your functions.

Let's cover both sides with practical examples.

## Lambda Execution Roles

The execution role defines what AWS services your Lambda function can access. Every Lambda function needs one.

### Minimal Execution Role

At minimum, a Lambda function needs to write to CloudWatch Logs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/my-function:*"
    }
  ]
}
```

Notice the resource is scoped to the specific function's log group, not `*`. This prevents one function from writing to another function's logs.

### Typical API Backend Role

A Lambda function that serves an API typically needs DynamoDB and maybe S3:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/api-handler:*"
    },
    {
      "Sid": "DynamoDBAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/Users",
        "arn:aws:dynamodb:us-east-1:123456789012:table/Users/index/*",
        "arn:aws:dynamodb:us-east-1:123456789012:table/Orders",
        "arn:aws:dynamodb:us-east-1:123456789012:table/Orders/index/*"
      ]
    },
    {
      "Sid": "S3ReadAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::app-assets/*"
    },
    {
      "Sid": "SecretsManagerRead",
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:api-keys-*"
    }
  ]
}
```

### Creating the Execution Role

```bash
# Create the trust policy for Lambda
cat > lambda-trust.json << 'EOF'
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
  --role-name api-handler-role \
  --assume-role-policy-document file://lambda-trust.json

# Attach the permissions policy
aws iam put-role-policy \
  --role-name api-handler-role \
  --policy-name api-handler-permissions \
  --policy-document file://api-handler-policy.json
```

## Lambda Invocation Permissions

Now for the other side - who can invoke your function. Lambda uses resource-based policies for this.

### Allow API Gateway to Invoke

```bash
# Grant API Gateway permission to invoke the Lambda function
aws lambda add-permission \
  --function-name api-handler \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:us-east-1:123456789012:abc123/*/GET/users"
```

The `source-arn` scopes the permission to a specific API, stage, method, and path. Without it, any API Gateway in the account could invoke your function.

### Allow S3 Events to Invoke

```bash
# Grant S3 permission to invoke a Lambda function on object creation
aws lambda add-permission \
  --function-name process-upload \
  --statement-id s3-trigger \
  --action lambda:InvokeFunction \
  --principal s3.amazonaws.com \
  --source-arn "arn:aws:s3:::upload-bucket" \
  --source-account 123456789012
```

Always include `source-account` when granting S3 permissions to prevent cross-account confusion.

### Allow EventBridge (CloudWatch Events) to Invoke

```bash
# Grant EventBridge permission to invoke a scheduled Lambda function
aws lambda add-permission \
  --function-name daily-cleanup \
  --statement-id eventbridge-schedule \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn "arn:aws:events:us-east-1:123456789012:rule/daily-cleanup-rule"
```

### Allow SNS to Invoke

```bash
# Grant SNS permission to invoke a Lambda function
aws lambda add-permission \
  --function-name notification-handler \
  --statement-id sns-trigger \
  --action lambda:InvokeFunction \
  --principal sns.amazonaws.com \
  --source-arn "arn:aws:sns:us-east-1:123456789012:alerts-topic"
```

### Allow SQS to Invoke (Event Source Mapping)

SQS is different - Lambda polls SQS, so the execution role needs SQS permissions rather than granting SQS permission to invoke:

```json
{
  "Sid": "AllowSQSPolling",
  "Effect": "Allow",
  "Action": [
    "sqs:ReceiveMessage",
    "sqs:DeleteMessage",
    "sqs:GetQueueAttributes"
  ],
  "Resource": "arn:aws:sqs:us-east-1:123456789012:order-queue"
}
```

Add this to the function's execution role, then create the event source mapping:

```bash
# Create an SQS event source mapping
aws lambda create-event-source-mapping \
  --function-name order-processor \
  --event-source-arn arn:aws:sqs:us-east-1:123456789012:order-queue \
  --batch-size 10
```

## Cross-Account Lambda Invocation

### Using Resource-Based Policy

Allow another account to invoke your function:

```bash
# Allow a specific role in another account to invoke the function
aws lambda add-permission \
  --function-name shared-auth-service \
  --statement-id cross-account-invoke \
  --action lambda:InvokeFunction \
  --principal "arn:aws:iam::987654321098:role/CallerRole"
```

The caller in Account B then invokes it:

```python
import boto3

# Invoke a Lambda function in another account
lambda_client = boto3.client("lambda", region_name="us-east-1")

response = lambda_client.invoke(
    FunctionName="arn:aws:lambda:us-east-1:123456789012:function:shared-auth-service",
    InvocationType="RequestResponse",
    Payload=b'{"userId": "12345"}'
)

result = response["Payload"].read()
print(result)
```

### Using Cross-Account Role

Alternatively, assume a role in the function's account:

```python
import boto3

# Assume a cross-account role, then invoke the function
sts = boto3.client("sts")
creds = sts.assume_role(
    RoleArn="arn:aws:iam::123456789012:role/LambdaInvokerRole",
    RoleSessionName="cross-account-invoke"
)["Credentials"]

lambda_client = boto3.client(
    "lambda",
    aws_access_key_id=creds["AccessKeyId"],
    aws_secret_access_key=creds["SecretAccessKey"],
    aws_session_token=creds["SessionToken"],
    region_name="us-east-1"
)

response = lambda_client.invoke(
    FunctionName="shared-auth-service",
    InvocationType="RequestResponse",
    Payload=b'{"userId": "12345"}'
)
```

## Viewing Lambda Permissions

Check the resource-based policy on a function:

```bash
# Get the resource-based policy (invocation permissions)
aws lambda get-policy --function-name my-function

# Get the execution role
aws lambda get-function-configuration \
  --function-name my-function \
  --query 'Role'
```

## Terraform Example

```hcl
# Lambda execution role
resource "aws_iam_role" "lambda_exec" {
  name = "order-processor-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Execution role permissions
resource "aws_iam_role_policy" "lambda_permissions" {
  name = "order-processor-permissions"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect   = "Allow"
        Action   = ["dynamodb:PutItem", "dynamodb:GetItem"]
        Resource = aws_dynamodb_table.orders.arn
      }
    ]
  })
}

# Lambda function
resource "aws_lambda_function" "processor" {
  function_name = "order-processor"
  role          = aws_iam_role.lambda_exec.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = "function.zip"
}

# Allow API Gateway to invoke
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.processor.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*"
}
```

## Best Practices

1. **One role per function** - Don't share execution roles between functions. Each function should have exactly the permissions it needs.
2. **Scope resource ARNs** - Use specific table names, bucket names, and secret IDs instead of wildcards.
3. **Use source ARN conditions** - When granting invoke permissions, always specify which source can trigger the function.
4. **Audit with Access Analyzer** - Use [Access Analyzer](https://oneuptime.com/blog/post/generate-iam-policies-access-activity-access-analyzer/view) to find overprivileged execution roles.
5. **Use Powertools for logging** - Lambda Powertools includes structured logging that helps you trace permission issues.

Lambda's dual permission model - execution roles and invocation permissions - gives you fine-grained control over both what functions can do and who can trigger them. Take advantage of both to build secure serverless applications.
