# How to Create CloudWatch Log Groups and Log Streams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Logging, Observability

Description: Learn how to create and manage CloudWatch Log Groups and Log Streams for organizing your application and infrastructure logs effectively.

---

CloudWatch Logs is the backbone of logging on AWS. Whether your logs come from Lambda functions, ECS containers, EC2 instances, or API Gateway, they all end up in CloudWatch Logs (unless you've set up an alternative). Understanding how Log Groups and Log Streams work - and how to configure them properly - is foundational to everything else you'll do with CloudWatch logging.

## Log Groups vs Log Streams

Think of it like a filing system. A **Log Group** is a folder that holds related logs. A **Log Stream** is a specific file within that folder, representing a single source of log events.

```mermaid
graph TD
    A[CloudWatch Logs] --> B[Log Group: /aws/lambda/order-api]
    A --> C[Log Group: /aws/ecs/payment-service]
    B --> D[Log Stream: 2026/02/12/[$LATEST]abc123]
    B --> E[Log Stream: 2026/02/12/[$LATEST]def456]
    C --> F[Log Stream: ecs/payment/task-id-1]
    C --> G[Log Stream: ecs/payment/task-id-2]
```

For Lambda, AWS creates a log group automatically (named `/aws/lambda/<function-name>`), and each function instance gets its own log stream. For ECS, the awslogs driver creates log groups and streams automatically too. But there are plenty of situations where you need to create them yourself - custom applications on EC2, batch jobs, or when you want a specific naming scheme.

## Creating Log Groups with the CLI

The simplest way to create a log group:

```bash
# Create a new log group
aws logs create-log-group \
  --log-group-name "/myapp/production/api" \
  --region us-east-1
```

You should also set a retention policy right away. By default, CloudWatch Logs retains data forever, which can get expensive fast:

```bash
# Set retention to 30 days
aws logs put-retention-policy \
  --log-group-name "/myapp/production/api" \
  --retention-in-days 30
```

Available retention options are: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, and 3653 days. Choose based on your compliance requirements and budget.

## Creating Log Groups with Tags

Tags help with cost allocation and organization:

```bash
# Create a log group with tags for cost tracking and ownership
aws logs create-log-group \
  --log-group-name "/myapp/production/worker" \
  --tags Environment=production,Team=backend,Service=worker,CostCenter=engineering
```

## Creating Log Streams

Log streams are created within a log group:

```bash
# Create a log stream within an existing log group
aws logs create-log-stream \
  --log-group-name "/myapp/production/api" \
  --log-stream-name "instance-i-1234567890-2026-02-12"
```

A common pattern is to name log streams after the source host or container, optionally including a date. This makes it easy to find logs from a specific instance.

## Creating Log Groups with CloudFormation

For infrastructure-as-code, use CloudFormation:

```yaml
Resources:
  ApiLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /myapp/production/api
      RetentionInDays: 30
      Tags:
        - Key: Environment
          Value: production
        - Key: Service
          Value: api

  WorkerLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /myapp/production/worker
      RetentionInDays: 14
      Tags:
        - Key: Environment
          Value: production
        - Key: Service
          Value: worker

  # Log group with KMS encryption
  SensitiveLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /myapp/production/auth
      RetentionInDays: 365
      KmsKeyId: !GetAtt LogEncryptionKey.Arn

  LogEncryptionKey:
    Type: AWS::KMS::Key
    Properties:
      Description: Encryption key for sensitive log groups
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Sid: Enable IAM User Permissions
            Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action: 'kms:*'
            Resource: '*'
          - Sid: Allow CloudWatch Logs
            Effect: Allow
            Principal:
              Service: !Sub 'logs.${AWS::Region}.amazonaws.com'
            Action:
              - 'kms:Encrypt*'
              - 'kms:Decrypt*'
              - 'kms:ReEncrypt*'
              - 'kms:GenerateDataKey*'
              - 'kms:Describe*'
            Resource: '*'
```

## Creating Log Groups with Terraform

If you're a Terraform shop:

```hcl
# Basic log group with retention
resource "aws_cloudwatch_log_group" "api" {
  name              = "/myapp/production/api"
  retention_in_days = 30

  tags = {
    Environment = "production"
    Service     = "api"
    Team        = "backend"
  }
}

# Log group with KMS encryption
resource "aws_cloudwatch_log_group" "auth" {
  name              = "/myapp/production/auth"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.log_encryption.arn

  tags = {
    Environment = "production"
    Service     = "auth"
  }
}

# Create log streams programmatically
resource "aws_cloudwatch_log_stream" "api_stream" {
  name           = "default"
  log_group_name = aws_cloudwatch_log_group.api.name
}
```

## Writing Log Events Programmatically

Once you have a log group and stream, you can write events to them. Here's how with Python:

```python
import boto3
import time

logs_client = boto3.client('logs', region_name='us-east-1')

log_group = '/myapp/production/api'
log_stream = f'instance-{instance_id}-{date_str}'

# Make sure the log stream exists
try:
    logs_client.create_log_stream(
        logGroupName=log_group,
        logStreamName=log_stream
    )
except logs_client.exceptions.ResourceAlreadyExistsException:
    pass  # Stream already exists, that's fine

# Put log events (must be in chronological order)
response = logs_client.put_log_events(
    logGroupName=log_group,
    logStreamName=log_stream,
    logEvents=[
        {
            'timestamp': int(time.time() * 1000),  # milliseconds since epoch
            'message': '{"level": "INFO", "msg": "Application started", "port": 8080}'
        },
        {
            'timestamp': int(time.time() * 1000) + 1,
            'message': '{"level": "INFO", "msg": "Connected to database", "host": "db.example.com"}'
        }
    ]
)
```

In Node.js, it looks like this:

```javascript
const { CloudWatchLogsClient, CreateLogStreamCommand, PutLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');

const client = new CloudWatchLogsClient({ region: 'us-east-1' });

async function writeLog(logGroup, logStream, message) {
  // Ensure the log stream exists
  try {
    await client.send(new CreateLogStreamCommand({
      logGroupName: logGroup,
      logStreamName: logStream,
    }));
  } catch (err) {
    if (err.name !== 'ResourceAlreadyExistsException') throw err;
  }

  // Write the log event
  await client.send(new PutLogEventsCommand({
    logGroupName: logGroup,
    logStreamName: logStream,
    logEvents: [
      {
        timestamp: Date.now(),
        message: JSON.stringify({
          level: 'INFO',
          msg: 'Request processed',
          duration: 45,
          statusCode: 200,
        }),
      },
    ],
  }));
}
```

## Naming Conventions

Good naming conventions make your logs easier to find and manage. Here are patterns that work well:

| Source | Log Group Name | Log Stream Name |
|--------|---------------|-----------------|
| Lambda | `/aws/lambda/<function-name>` | Auto-generated |
| ECS | `/aws/ecs/<service-name>` | `<container>/<task-id>` |
| EC2 App | `/myapp/<env>/<service>` | `<instance-id>/<date>` |
| API Gateway | `/aws/apigateway/<api-name>` | Auto-generated |
| Batch Jobs | `/myapp/<env>/batch/<job-name>` | `<job-id>` |

The `/aws/` prefix is conventionally reserved for AWS-managed log groups. For your own applications, use a prefix like `/myapp/` or your company name.

## Log Group Classes

CloudWatch Logs offers two log group classes:

- **Standard** - full functionality, all features available
- **Infrequent Access** - lower cost but with reduced features (no live tail, limited Logs Insights)

For logs you only query occasionally (like debug-level logs or audit trails), Infrequent Access can cut your costs significantly:

```bash
# Create a log group with Infrequent Access class
aws logs create-log-group \
  --log-group-name "/myapp/production/debug" \
  --log-group-class INFREQUENT_ACCESS
```

## Managing Log Groups at Scale

When you have dozens or hundreds of log groups, you need scripts to manage retention and cleanup:

```bash
# List all log groups and their retention settings
aws logs describe-log-groups \
  --query 'logGroups[*].[logGroupName, retentionInDays]' \
  --output table

# Find log groups with no retention policy (infinite retention)
aws logs describe-log-groups \
  --query 'logGroups[?!retentionInDays].[logGroupName, storedBytes]' \
  --output table
```

Setting retention on all groups that don't have one:

```bash
# Set 90-day retention on all log groups that currently have no retention policy
for lg in $(aws logs describe-log-groups --query 'logGroups[?!retentionInDays].logGroupName' --output text); do
  echo "Setting 90-day retention on: $lg"
  aws logs put-retention-policy --log-group-name "$lg" --retention-in-days 90
done
```

## Wrapping Up

Log Groups and Log Streams are simple concepts, but getting them right from the start saves you headaches later. Set retention policies immediately - don't let logs accumulate forever. Use consistent naming conventions. Consider encryption for sensitive logs. And if cost is a concern, look into the Infrequent Access log class for logs you rarely query.

With your log groups set up, the next steps are [creating metric filters](https://oneuptime.com/blog/post/create-cloudwatch-metric-filters-log-data/view) to extract metrics from your logs, and [writing Logs Insights queries](https://oneuptime.com/blog/post/cloudwatch-logs-insights-query-syntax/view) to analyze your log data.
