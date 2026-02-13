# How to Fix Lambda 'Permission Denied' When Accessing Other Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, IAM, Serverless, Troubleshooting

Description: Fix Lambda permission denied errors when accessing DynamoDB, S3, SQS, and other AWS services by configuring the correct IAM execution role policies.

---

Your Lambda function runs fine in theory, but when it tries to talk to DynamoDB, S3, SQS, or any other AWS service, you get an error like:

```
An error occurred (AccessDeniedException) when calling the PutItem operation:
User: arn:aws:sts::123456789012:assumed-role/my-lambda-role/my-function
is not authorized to perform: dynamodb:PutItem on resource: arn:aws:dynamodb:us-east-1:123456789012:table/my-table
```

This is an IAM permissions issue. Your Lambda function's execution role doesn't have the permissions it needs. Let's fix it.

## How Lambda Permissions Work

Every Lambda function has an execution role - an IAM role that the function assumes when it runs. Whatever permissions that role has, the function has. Whatever the role lacks, the function can't do.

First, find out what role your function is using:

```bash
# Get the function's execution role
aws lambda get-function-configuration \
  --function-name my-function \
  --query 'Role' \
  --output text
```

Then check what policies are attached to that role:

```bash
ROLE_NAME="my-lambda-role"

# List attached managed policies
aws iam list-attached-role-policies \
  --role-name $ROLE_NAME \
  --query 'AttachedPolicies[*].{Name:PolicyName,ARN:PolicyArn}'

# List inline policies
aws iam list-role-policies \
  --role-name $ROLE_NAME
```

## Adding Permissions for Common Services

### DynamoDB Access

```bash
# Create a policy for DynamoDB access
cat > /tmp/dynamodb-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:us-east-1:123456789012:table/my-table",
        "arn:aws:dynamodb:us-east-1:123456789012:table/my-table/index/*"
      ]
    }
  ]
}
EOF

# Attach the inline policy to the Lambda role
aws iam put-role-policy \
  --role-name my-lambda-role \
  --policy-name DynamoDBAccess \
  --policy-document file:///tmp/dynamodb-policy.json
```

Note the second resource ARN with `/index/*` - this grants access to the table's GSIs and LSIs. Without it, queries against indexes will fail.

### S3 Access

```bash
cat > /tmp/s3-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::my-bucket"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name my-lambda-role \
  --policy-name S3Access \
  --policy-document file:///tmp/s3-policy.json
```

Remember: `ListBucket` uses the bucket ARN without `/*`, while `GetObject`/`PutObject` use the bucket ARN with `/*`. This trips people up constantly. See our [S3 403 errors guide](https://oneuptime.com/blog/post/2026-02-12-fix-s3-403-access-denied-errors/view) for more on this.

### SQS Access

```bash
cat > /tmp/sqs-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:us-east-1:123456789012:my-queue"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name my-lambda-role \
  --policy-name SQSAccess \
  --policy-document file:///tmp/sqs-policy.json
```

### SNS Access

```bash
cat > /tmp/sns-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sns:Publish",
      "Resource": "arn:aws:sns:us-east-1:123456789012:my-topic"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name my-lambda-role \
  --policy-name SNSAccess \
  --policy-document file:///tmp/sns-policy.json
```

### Secrets Manager Access

```bash
cat > /tmp/secrets-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-secret-*"
    }
  ]
}
EOF

aws iam put-role-policy \
  --role-name my-lambda-role \
  --policy-name SecretsAccess \
  --policy-document file:///tmp/secrets-policy.json
```

Note the wildcard at the end of the secret ARN. Secrets Manager appends a random suffix to secret ARNs, so you need the wildcard to match.

## The Trust Policy

The execution role also needs a trust policy that allows Lambda to assume it. If this is wrong, the function won't start at all:

```bash
# Check the trust policy
aws iam get-role \
  --role-name my-lambda-role \
  --query 'Role.AssumeRolePolicyDocument'
```

It should look like this:

```json
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
```

## Common Gotcha: KMS Permissions

If you're accessing encrypted resources (encrypted DynamoDB tables, S3 objects encrypted with KMS, encrypted SQS queues), you also need KMS permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt",
        "kms:GenerateDataKey"
      ],
      "Resource": "arn:aws:kms:us-east-1:123456789012:key/your-kms-key-id"
    }
  ]
}
```

Without this, you'll get cryptic errors like "Access Denied" even when your service-specific permissions look correct.

## Common Gotcha: VPC Permissions

If your Lambda is in a VPC, it needs additional permissions to create network interfaces:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:CreateNetworkInterface",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DeleteNetworkInterface"
      ],
      "Resource": "*"
    }
  ]
}
```

AWS provides a managed policy for this: `AWSLambdaVPCAccessExecutionRole`. You can attach it instead of creating a custom one:

```bash
aws iam attach-role-policy \
  --role-name my-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
```

## Debugging with IAM Policy Simulator

The IAM Policy Simulator can tell you exactly which permissions are allowed or denied:

```bash
# Test if the role can write to DynamoDB
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789012:role/my-lambda-role \
  --action-names dynamodb:PutItem \
  --resource-arns arn:aws:dynamodb:us-east-1:123456789012:table/my-table \
  --query 'EvaluationResults[*].{Action:EvalActionName,Decision:EvalDecision}'
```

## Using CloudFormation or SAM for Permissions

If you're using AWS SAM or CloudFormation, you can define permissions alongside your function:

```yaml
# AWS SAM template
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: python3.12
      Policies:
        # SAM policy templates make this easy
        - DynamoDBCrudPolicy:
            TableName: !Ref MyTable
        - S3ReadPolicy:
            BucketName: !Ref MyBucket
        - SQSSendMessagePolicy:
            QueueName: !GetAtt MyQueue.QueueName
```

SAM policy templates are a much cleaner way to manage Lambda permissions than manually editing IAM policies.

## Least Privilege Tips

Don't just slap `AdministratorAccess` on your Lambda role. That's a security incident waiting to happen. Instead:

1. Start with no permissions and add them as needed
2. Use specific resource ARNs instead of `"*"`
3. Only grant the actions your function actually uses
4. Use conditions to further restrict access when possible
5. Review and audit Lambda role permissions regularly

Monitoring your Lambda functions for permission errors helps you catch misconfigurations early. [OneUptime](https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view) can alert you when your functions start throwing AccessDenied errors, so you can fix them before they impact users.
