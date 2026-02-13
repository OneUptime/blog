# How to Set Up S3 Bucket Notifications to EventBridge

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, EventBridge, Serverless

Description: Complete guide to configuring S3 bucket notifications with Amazon EventBridge for event-driven architectures, including rules, targets, and filtering patterns.

---

S3 bucket notifications have been around for a while - you could send events to SNS, SQS, or Lambda. But they were limited. You could only filter by prefix and suffix, and each bucket had a single notification configuration. EventBridge changes all of that.

With EventBridge, S3 events become first-class events that you can route to over 20 different target services using sophisticated pattern matching. You can filter by object size, requester, source IP, and more. Let's set it up.

## Why EventBridge Over Traditional Notifications

The old way (S3 notification configuration to Lambda/SNS/SQS) still works, but EventBridge gives you:

- **Advanced filtering**: Filter on any field in the event, not just prefix/suffix
- **Multiple targets**: Send one event to many destinations without fan-out logic
- **Archive and replay**: Store events and replay them for debugging or reprocessing
- **Cross-account routing**: Send events to other AWS accounts natively
- **Schema discovery**: Auto-detect event structures

## Step 1: Enable EventBridge Notifications on the Bucket

This is the only S3-side configuration needed. One toggle.

```bash
# Enable EventBridge notifications for the bucket
aws s3api put-bucket-notification-configuration \
  --bucket my-data-bucket \
  --notification-configuration '{
    "EventBridgeConfiguration": {}
  }'
```

That's it. S3 will now send all events for this bucket to EventBridge. You don't pick which events at this stage - that filtering happens in EventBridge rules.

Important note: if your bucket already has SNS/SQS/Lambda notification configurations, include them in the command above. Otherwise, you'll overwrite them.

```bash
# Enable EventBridge while preserving existing Lambda notification
aws s3api put-bucket-notification-configuration \
  --bucket my-data-bucket \
  --notification-configuration '{
    "EventBridgeConfiguration": {},
    "LambdaFunctionConfigurations": [
      {
        "LambdaFunctionArn": "arn:aws:lambda:us-east-1:123456789012:function/existing-function",
        "Events": ["s3:ObjectCreated:*"]
      }
    ]
  }'
```

## Step 2: Create an EventBridge Rule

Now create a rule that matches the S3 events you care about and routes them to a target.

A basic rule that matches all object creation events for the bucket.

```bash
# Create rule for object creation events
aws events put-rule \
  --name s3-object-created \
  --event-pattern '{
    "source": ["aws.s3"],
    "detail-type": ["Object Created"],
    "detail": {
      "bucket": {
        "name": ["my-data-bucket"]
      }
    }
  }' \
  --state ENABLED \
  --description "Trigger on new objects in my-data-bucket"
```

## Step 3: Add Targets

Route matched events to one or more targets.

Send events to a Lambda function.

```bash
# Add Lambda target
aws events put-targets \
  --rule s3-object-created \
  --targets '[
    {
      "Id": "process-upload",
      "Arn": "arn:aws:lambda:us-east-1:123456789012:function/process-s3-upload"
    }
  ]'
```

You can add multiple targets to a single rule. Each target gets a copy of the event.

```bash
# Add multiple targets - Lambda, SQS, and Step Functions
aws events put-targets \
  --rule s3-object-created \
  --targets '[
    {
      "Id": "lambda-processor",
      "Arn": "arn:aws:lambda:us-east-1:123456789012:function/process-s3-upload"
    },
    {
      "Id": "sqs-queue",
      "Arn": "arn:aws:sqs:us-east-1:123456789012:upload-notifications"
    },
    {
      "Id": "step-function",
      "Arn": "arn:aws:states:us-east-1:123456789012:stateMachine:ProcessUpload",
      "RoleArn": "arn:aws:iam::123456789012:role/EventBridgeStepFunctionsRole"
    }
  ]'
```

## Advanced Filtering

Here's where EventBridge really shines. You can filter on any field in the event detail.

Match only objects in a specific prefix with a specific file extension.

```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": {
      "name": ["my-data-bucket"]
    },
    "object": {
      "key": [{
        "prefix": "uploads/images/"
      }]
    }
  }
}
```

Match objects larger than 1 MB.

```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": {
      "name": ["my-data-bucket"]
    },
    "object": {
      "size": [{
        "numeric": [">", 1048576]
      }]
    }
  }
}
```

Match deletion events for a specific bucket.

```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Deleted"],
  "detail": {
    "bucket": {
      "name": ["my-data-bucket"]
    },
    "deletion-type": ["Permanently Deleted"]
  }
}
```

## S3 Event Types Available in EventBridge

EventBridge receives these S3 event types:

- **Object Created** - New object uploaded (PUT, POST, COPY, multipart upload)
- **Object Deleted** - Object deleted (includes delete markers for versioned buckets)
- **Object Restore Initiated** - Glacier restore started
- **Object Restore Completed** - Glacier restore finished
- **Object Restore Expired** - Temporary restore copy expired
- **Object Tags Added** - Tags added to an object
- **Object Tags Deleted** - Tags removed from an object
- **Object ACL Updated** - Object ACL changed
- **Object Storage Class Changed** - Lifecycle transition

## Event Structure

Understanding the event structure helps you write better filters and process events correctly. Here's what an Object Created event looks like.

```json
{
  "version": "0",
  "id": "abc123-def456",
  "detail-type": "Object Created",
  "source": "aws.s3",
  "account": "123456789012",
  "time": "2026-02-12T10:30:00Z",
  "region": "us-east-1",
  "detail": {
    "version": "0",
    "bucket": {
      "name": "my-data-bucket"
    },
    "object": {
      "key": "uploads/report-2026.csv",
      "size": 1048576,
      "etag": "abc123def456",
      "version-id": "abc123",
      "sequencer": "0A1B2C3D4E5F"
    },
    "request-id": "ABC123DEF",
    "requester": "123456789012",
    "source-ip-address": "203.0.113.50",
    "reason": "PutObject"
  }
}
```

## Setting Up Event Archive and Replay

One of EventBridge's killer features is archiving events for replay. This is invaluable for debugging and reprocessing.

```bash
# Create an archive for S3 events
aws events create-archive \
  --archive-name s3-events-archive \
  --source-arn arn:aws:events:us-east-1:123456789012:event-bus/default \
  --event-pattern '{
    "source": ["aws.s3"],
    "detail-type": ["Object Created"]
  }' \
  --retention-days 30 \
  --description "Archive of S3 object creation events"
```

Replay archived events for a specific time window.

```bash
# Replay events from a specific time range
aws events start-replay \
  --replay-name reprocess-uploads \
  --event-source-arn arn:aws:events:us-east-1:123456789012:event-bus/default \
  --destination '{
    "Arn": "arn:aws:events:us-east-1:123456789012:event-bus/default"
  }' \
  --event-start-time 2026-02-10T00:00:00Z \
  --event-end-time 2026-02-10T23:59:59Z
```

## Cross-Account Event Routing

Send S3 events from one account to another using EventBridge cross-account rules.

In the source account, create a rule that sends events to the target account's event bus.

```bash
# In source account - route events to target account
aws events put-targets \
  --rule s3-object-created \
  --targets '[
    {
      "Id": "cross-account-target",
      "Arn": "arn:aws:events:us-east-1:999888777666:event-bus/default",
      "RoleArn": "arn:aws:iam::123456789012:role/EventBridgeCrossAccountRole"
    }
  ]'
```

In the target account, add a resource policy to allow the source account.

```bash
# In target account - allow source account to put events
aws events put-permission \
  --statement-id allow-source-account \
  --action events:PutEvents \
  --principal 123456789012
```

## Monitoring Your Event Pipeline

Keep track of your EventBridge rules and targets to ensure events are flowing.

```bash
# Check rule metrics
aws cloudwatch get-metric-data \
  --metric-data-queries '[
    {
      "Id": "invocations",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/Events",
          "MetricName": "Invocations",
          "Dimensions": [{"Name": "RuleName", "Value": "s3-object-created"}]
        },
        "Period": 3600,
        "Stat": "Sum"
      }
    },
    {
      "Id": "failed",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/Events",
          "MetricName": "FailedInvocations",
          "Dimensions": [{"Name": "RuleName", "Value": "s3-object-created"}]
        },
        "Period": 3600,
        "Stat": "Sum"
      }
    }
  ]' \
  --start-time 2026-02-12T00:00:00Z \
  --end-time 2026-02-12T23:59:59Z
```

For production event pipelines, set up comprehensive monitoring with [OneUptime](https://oneuptime.com) to track event delivery rates, processing latency, and alert on failures.

## Tips and Gotchas

1. **Event delivery is at least once** - Your targets should be idempotent because you might receive duplicate events.
2. **No ordering guarantee** - Events may arrive out of order. Use the sequencer field if order matters.
3. **Latency** - EventBridge adds a few seconds of latency compared to direct S3 notifications. For most use cases this doesn't matter.
4. **Cost** - EventBridge charges per event published. High-volume buckets can generate significant costs. Filter aggressively.

For more on building event-driven S3 architectures, check out our guide on [configuring S3 bucket metrics in CloudWatch](https://oneuptime.com/blog/post/2026-02-12-s3-bucket-metrics-cloudwatch/view).
