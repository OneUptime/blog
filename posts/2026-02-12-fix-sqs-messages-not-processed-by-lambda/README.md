# How to Fix SQS Messages Not Being Processed by Lambda

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SQS, Lambda, Serverless, Debugging

Description: Troubleshoot and fix SQS messages not being processed by Lambda, covering event source mappings, IAM permissions, visibility timeout, DLQ configuration, and concurrency issues.

---

You've set up an SQS queue, connected a Lambda function, and messages are piling up in the queue. Lambda isn't picking them up, or it's processing them but they keep reappearing. This integration looks simple on the surface but there are several things that can go wrong. Let's work through each one.

## Verify the Event Source Mapping

Lambda polls SQS through an event source mapping. If this mapping doesn't exist, is disabled, or is misconfigured, Lambda won't read from the queue.

```bash
# List event source mappings for your Lambda function
aws lambda list-event-source-mappings \
    --function-name my-function \
    --query 'EventSourceMappings[].{UUID:UUID,Source:EventSourceArn,State:State,BatchSize:BatchSize}'
```

If no mapping exists, create one:

```bash
# Create event source mapping
aws lambda create-event-source-mapping \
    --function-name my-function \
    --event-source-arn arn:aws:sqs:us-east-1:123456789012:my-queue \
    --batch-size 10 \
    --maximum-batching-window-in-seconds 5
```

If the mapping exists but the state isn't "Enabled," enable it:

```bash
# Enable the event source mapping
aws lambda update-event-source-mapping \
    --uuid <mapping-uuid> \
    --enabled
```

The state can also be "Disabling" or "Creating" or "Updating" - wait for it to settle.

## IAM Permissions

Lambda's execution role needs permission to interact with SQS. Without these permissions, the event source mapping can't poll the queue.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sqs:ReceiveMessage",
                "sqs:DeleteMessage",
                "sqs:GetQueueAttributes"
            ],
            "Resource": "arn:aws:sqs:us-east-1:123456789012:my-queue"
        }
    ]
}
```

All three actions are required:
- `sqs:ReceiveMessage` - to read messages
- `sqs:DeleteMessage` - to remove messages after successful processing
- `sqs:GetQueueAttributes` - to check queue metrics for scaling decisions

Verify the role has these permissions:

```bash
# Check the Lambda function's role
aws lambda get-function-configuration \
    --function-name my-function \
    --query 'Role'

# List the role's policies
aws iam list-attached-role-policies --role-name my-lambda-role
aws iam list-role-policies --role-name my-lambda-role
```

If the queue is encrypted with a CMK (customer-managed KMS key), the role also needs `kms:Decrypt`:

```json
{
    "Effect": "Allow",
    "Action": "kms:Decrypt",
    "Resource": "arn:aws:kms:us-east-1:123456789012:key/abc-123-def-456"
}
```

## Lambda Function Errors

If Lambda invokes successfully but the function crashes, SQS messages become visible again after the visibility timeout expires and get reprocessed. This creates a loop where messages keep reappearing.

Check for Lambda errors:

```bash
# Check Lambda error metrics
aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Errors \
    --dimensions Name=FunctionName,Value=my-function \
    --start-time 2026-02-11T00:00:00Z \
    --end-time 2026-02-12T00:00:00Z \
    --period 300 \
    --statistics Sum

# Check Lambda logs
aws logs filter-log-events \
    --log-group-name /aws/lambda/my-function \
    --start-time $(date -d '1 hour ago' +%s000) \
    --filter-pattern "ERROR"
```

Common Lambda errors that cause message reprocessing:
- Timeout (function takes longer than configured timeout)
- Out of memory
- Unhandled exceptions
- Import errors

## Visibility Timeout Mismatch

This is a critical setting. The SQS visibility timeout must be at least 6 times your Lambda timeout. When Lambda picks up a message, SQS makes it invisible to other consumers for the visibility timeout duration. If Lambda takes longer than the visibility timeout, SQS assumes processing failed and makes the message visible again.

```bash
# Check Lambda timeout
aws lambda get-function-configuration \
    --function-name my-function \
    --query 'Timeout'

# Check SQS visibility timeout
aws sqs get-queue-attributes \
    --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
    --attribute-names VisibilityTimeout
```

If Lambda timeout is 60 seconds, set visibility timeout to at least 360 seconds:

```bash
# Update SQS visibility timeout
aws sqs set-queue-attributes \
    --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
    --attributes VisibilityTimeout=360
```

## Lambda Concurrency Issues

If your Lambda function has reserved concurrency set to 0, it can't run at all. If it's set too low, the event source mapping might throttle.

```bash
# Check concurrency settings
aws lambda get-function-concurrency \
    --function-name my-function

# Check account-level concurrency
aws lambda get-account-settings \
    --query 'AccountLimit.ConcurrentExecutions'
```

When Lambda is throttled, the event source mapping backs off and retries. Messages pile up in the queue.

```bash
# Check for throttling
aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Throttles \
    --dimensions Name=FunctionName,Value=my-function \
    --start-time 2026-02-11T00:00:00Z \
    --end-time 2026-02-12T00:00:00Z \
    --period 300 \
    --statistics Sum
```

## Dead Letter Queue (DLQ)

Messages that fail processing repeatedly should go to a DLQ instead of cycling forever. Configure the DLQ on the SQS queue (not on Lambda):

```bash
# Set up a DLQ with a redrive policy
aws sqs set-queue-attributes \
    --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-queue \
    --attributes '{
        "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:us-east-1:123456789012:my-dlq\",\"maxReceiveCount\":\"3\"}"
    }'
```

`maxReceiveCount` of 3 means after 3 failed processing attempts, the message goes to the DLQ. Check your DLQ for failed messages:

```bash
# Check how many messages are in the DLQ
aws sqs get-queue-attributes \
    --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/my-dlq \
    --attribute-names ApproximateNumberOfMessages
```

## FIFO Queue Specifics

FIFO queues have additional constraints. If one message in a message group fails, all subsequent messages in that group are blocked until the failed message succeeds or goes to the DLQ.

```python
# Lambda handler for FIFO queue
def handler(event, context):
    for record in event['Records']:
        message_group_id = record['attributes']['MessageGroupId']
        body = record['body']

        try:
            process_message(body)
        except Exception as e:
            # For FIFO queues, a single failure blocks the entire message group
            print(f"Error processing message in group {message_group_id}: {e}")
            raise  # Re-raise to signal failure to SQS
```

## Batch Processing and Partial Failures

By default, if your Lambda function throws an error, all messages in the batch are returned to the queue. You can enable partial batch response to only return failed messages:

```bash
# Enable partial batch response
aws lambda update-event-source-mapping \
    --uuid <mapping-uuid> \
    --function-response-types ReportBatchItemFailures
```

Then report individual failures from your handler:

```python
def handler(event, context):
    batch_item_failures = []

    for record in event['Records']:
        try:
            process_message(record['body'])
        except Exception as e:
            # Report this specific message as failed
            batch_item_failures.append({
                'itemIdentifier': record['messageId']
            })

    return {
        'batchItemFailures': batch_item_failures
    }
```

This prevents successfully processed messages from being reprocessed when one message in the batch fails.

## Monitoring the Integration

Set up alarms for the key metrics:

```bash
# Messages visible in queue (messages waiting to be processed)
aws cloudwatch put-metric-alarm \
    --alarm-name "SQS-Backlog-High" \
    --namespace AWS/SQS \
    --metric-name ApproximateNumberOfMessagesVisible \
    --dimensions Name=QueueName,Value=my-queue \
    --statistic Average \
    --period 300 \
    --threshold 1000 \
    --comparison-operator GreaterThanThreshold \
    --evaluation-periods 2 \
    --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
```

For comprehensive monitoring of your SQS-Lambda integration, including backlog growth, error rates, and DLQ activity, check out [setting up proper alerting](https://oneuptime.com/blog/post/aws-cloudwatch-alerting-best-practices/view) for your serverless architecture.

## Summary

SQS messages not being processed by Lambda usually comes down to: no event source mapping, wrong IAM permissions, Lambda function errors causing message recycling, visibility timeout too short, or concurrency limits. Verify the event source mapping exists and is enabled, check Lambda has SQS permissions, set visibility timeout to 6x Lambda timeout, enable partial batch responses for better error handling, and always configure a DLQ to catch messages that can't be processed.
