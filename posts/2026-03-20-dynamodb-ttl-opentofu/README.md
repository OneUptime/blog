# How to Configure DynamoDB TTL with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, DynamoDB, TTL, Time to Live, Cost Optimization, Infrastructure as Code

Description: Learn how to configure DynamoDB Time to Live with OpenTofu to automatically expire and delete items based on a timestamp attribute, reducing storage costs without manual cleanup.

## Introduction

DynamoDB Time to Live (TTL) automatically deletes expired items from a table based on a specified timestamp, without consuming write throughput. It's ideal for session data, temporary caches, event logs, and any data with a natural expiration. If DynamoDB Streams are enabled, deleted items appear as service deletions, allowing downstream cleanup in related systems.

## Prerequisites

- OpenTofu v1.6+
- AWS credentials with DynamoDB permissions

## Step 1: Enable TTL on DynamoDB Table

```hcl
resource "aws_dynamodb_table" "sessions" {
  name         = "${var.project_name}-user-sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "userId"
  range_key    = "sessionId"

  attribute {
    name = "userId"
    type = "S"
  }

  attribute {
    name = "sessionId"
    type = "S"
  }

  # Enable TTL - attribute must be a Number containing Unix epoch timestamp
  ttl {
    attribute_name = "expiresAt"  # Unix timestamp (seconds since epoch)
    enabled        = true
  }

  server_side_encryption {
    enabled = true
  }

  point_in_time_recovery {
    enabled = true
  }

  # Enable streams to capture TTL deletions
  stream_enabled   = true
  stream_view_type = "OLD_IMAGE"  # Capture the item before deletion

  tags = {
    Name = "${var.project_name}-user-sessions"
  }
}
```

## Step 2: Application Code to Set TTL Values

```python
import boto3
import time

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('my-project-user-sessions')

def create_session(user_id: str, session_id: str, session_data: dict):
    """Create a session that expires in 24 hours."""
    ttl = int(time.time()) + (24 * 60 * 60)  # Current time + 24 hours

    table.put_item(Item={
        'userId': user_id,
        'sessionId': session_id,
        'data': session_data,
        'createdAt': int(time.time()),
        'expiresAt': ttl  # DynamoDB will delete this item after this timestamp
    })

def extend_session(user_id: str, session_id: str, hours: int = 24):
    """Extend a session's TTL."""
    new_ttl = int(time.time()) + (hours * 60 * 60)

    table.update_item(
        Key={'userId': user_id, 'sessionId': session_id},
        UpdateExpression='SET expiresAt = :ttl',
        ConditionExpression='attribute_exists(userId) AND attribute_exists(sessionId)',
        ExpressionAttributeValues={':ttl': new_ttl}
    )
```

## Step 3: Lambda to Process TTL Deletions via Stream

```hcl
resource "aws_lambda_event_source_mapping" "ttl_cleanup" {
  event_source_arn  = aws_dynamodb_table.sessions.stream_arn
  function_name     = var.cleanup_lambda_arn
  starting_position = "LATEST"

  # Filter to only process TTL deletions (userIdentity type "Service")
  filter_criteria {
    filter {
      pattern = jsonencode({
        userIdentity = {
          type = ["Service"]
          principalId = ["dynamodb.amazonaws.com"]
        }
        eventName = ["REMOVE"]
      })
    }
  }
}
```

## Step 4: Deploy

```bash
tofu init
tofu plan
tofu apply

# Verify TTL configuration

aws dynamodb describe-time-to-live \
  --table-name my-project-user-sessions
```

## Step 5: Monitor TTL Activity

```hcl
resource "aws_cloudwatch_metric_alarm" "ttl_deleted_items" {
  alarm_name          = "${var.project_name}-dynamodb-ttl-deletions"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "TimeToLiveDeletedItemCount"
  namespace           = "AWS/DynamoDB"
  period              = 3600
  statistic           = "Sum"
  threshold           = 10000  # Alert if more than 10k items deleted per hour

  dimensions = {
    TableName = aws_dynamodb_table.sessions.name
  }
}
```

## Conclusion

DynamoDB TTL is the most cost-effective way to manage data lifecycle for time-bounded records-deletions do not consume write throughput in the region where the TTL expiry occurs and typically happen within a few days of the expiry time. Note that TTL is not precise: items may persist after the TTL timestamp until the background deletion process runs. Applications must filter expired items in scan or query results if strict expiry is required. Use the stream filter to distinguish TTL deletions (by `dynamodb.amazonaws.com` principal) from application-initiated deletions.
