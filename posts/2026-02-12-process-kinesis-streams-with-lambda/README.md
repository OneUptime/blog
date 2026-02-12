# How to Process Kinesis Streams with Lambda

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Kinesis, Lambda, Serverless, Streaming

Description: Learn how to process Amazon Kinesis Data Streams records with AWS Lambda, including event source mapping configuration, error handling, and performance tuning.

---

Using Lambda to process Kinesis records is one of the most common serverless patterns on AWS. Lambda polls the stream for you, batches records together, and invokes your function. No servers to manage, no consumer groups to coordinate, and automatic scaling based on the number of shards.

But it's not just "point Lambda at Kinesis and walk away." There are configuration knobs that directly affect your throughput, latency, and error handling behavior. Let's go through all of them.

## Setting Up the Event Source Mapping

The event source mapping connects your Lambda function to the Kinesis stream. It tells Lambda how to poll the stream and how to batch records.

This creates an event source mapping that processes records from the stream in batches.

```bash
aws lambda create-event-source-mapping \
  --function-name process-user-events \
  --event-source-arn arn:aws:kinesis:us-east-1:123456789:stream/user-events \
  --starting-position LATEST \
  --batch-size 100 \
  --maximum-batching-window-in-seconds 5 \
  --parallelization-factor 1 \
  --maximum-retry-attempts 3 \
  --bisect-batch-on-function-error true \
  --maximum-record-age-in-seconds 86400 \
  --destination-config '{
    "OnFailure": {
      "Destination": "arn:aws:sqs:us-east-1:123456789:kinesis-dlq"
    }
  }'
```

Let's break down what each parameter does:

- **starting-position**: LATEST (newest records) or TRIM_HORIZON (oldest available)
- **batch-size**: Max number of records per invocation (up to 10,000)
- **maximum-batching-window-in-seconds**: Wait up to N seconds to fill the batch
- **parallelization-factor**: Number of concurrent Lambda invocations per shard (1-10)
- **bisect-batch-on-function-error**: Splits the batch in half on error to isolate the bad record
- **maximum-retry-attempts**: How many times to retry a failed batch
- **maximum-record-age-in-seconds**: Discard records older than this

## Writing the Lambda Handler

Your Lambda function receives a batch of Kinesis records in the event payload. Each record has base64-encoded data that you need to decode.

This Python Lambda function processes Kinesis records and handles individual record failures.

```python
import json
import base64
import boto3
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('processed-events')

def handler(event, context):
    print(f"Processing {len(event['Records'])} records")

    successful = 0
    failed = 0

    for record in event['Records']:
        try:
            # Decode the Kinesis record data
            payload = base64.b64decode(record['kinesis']['data'])
            data = json.loads(payload)

            # Get metadata
            shard_id = record['eventID'].split(':')[0]
            sequence_number = record['kinesis']['sequenceNumber']
            arrival_timestamp = record['kinesis']['approximateArrivalTimestamp']

            # Process the record
            process_event(data, sequence_number)
            successful += 1

        except Exception as e:
            failed += 1
            print(f"Error processing record: {e}")
            print(f"Record data: {record['kinesis']['data']}")

    print(f"Processed: {successful} successful, {failed} failed")

    # If any records failed and you want the whole batch to retry,
    # raise an exception. Otherwise, just log and continue.
    if failed > 0:
        raise Exception(f"{failed} records failed processing")

def process_event(data, sequence_number):
    """Process a single event record."""
    # Example: Write to DynamoDB
    table.put_item(Item={
        'eventId': data.get('eventId', sequence_number),
        'userId': data['userId'],
        'eventType': data['eventType'],
        'timestamp': data['timestamp'],
        'processedAt': datetime.utcnow().isoformat()
    })
```

## Partial Batch Response

Instead of failing the entire batch when one record fails, you can report which specific records failed. Lambda will only retry those records.

This Lambda function uses partial batch response to report individual record failures.

```python
import json
import base64

def handler(event, context):
    batch_item_failures = []

    for record in event['Records']:
        try:
            payload = base64.b64decode(record['kinesis']['data'])
            data = json.loads(payload)

            # Process the record
            process_event(data)

        except Exception as e:
            print(f"Failed record {record['kinesis']['sequenceNumber']}: {e}")
            batch_item_failures.append({
                "itemIdentifier": record['kinesis']['sequenceNumber']
            })

    return {
        "batchItemFailures": batch_item_failures
    }

def process_event(data):
    # Your processing logic here
    pass
```

To enable this, update the event source mapping.

```bash
aws lambda update-event-source-mapping \
  --uuid your-mapping-uuid \
  --function-response-types ReportBatchItemFailures
```

## Parallelization Factor

By default, Lambda processes one batch at a time per shard. If your function is I/O bound (making API calls, writing to databases), you can increase the parallelization factor to process multiple batches from the same shard concurrently.

```bash
aws lambda update-event-source-mapping \
  --uuid your-mapping-uuid \
  --parallelization-factor 5
```

With a parallelization factor of 5 and 4 shards, you'll have up to 20 concurrent Lambda invocations. But be careful - records from the same shard are still delivered in order within a batch, but batches may be processed out of order when parallelization is greater than 1.

## Tumbling Windows for Aggregation

Lambda supports tumbling windows that let you aggregate records over a fixed time period. This is useful for computing running totals, counts, or averages.

This function uses tumbling windows to compute per-minute aggregations.

```python
import json
import base64

def handler(event, context):
    print(f"Window: {event.get('window', {})}")
    print(f"Records: {len(event['Records'])}")

    # Get the existing state from a previous invocation in this window
    state = event.get('state', {})

    for record in event['Records']:
        payload = base64.b64decode(record['kinesis']['data'])
        data = json.loads(payload)

        event_type = data.get('eventType', 'unknown')

        # Accumulate counts per event type
        if event_type not in state:
            state[event_type] = 0
        state[event_type] += 1

    # Check if this is the final invocation for this window
    if event.get('isFinalInvokeForWindow', False):
        # Window is complete - write the aggregation somewhere
        print(f"Final aggregation: {json.dumps(state)}")
        save_aggregation(event['window'], state)

    # Return the state for the next invocation in this window
    return {"state": state}

def save_aggregation(window, state):
    # Write to DynamoDB, S3, etc.
    pass
```

Configure the tumbling window on the event source mapping.

```bash
aws lambda update-event-source-mapping \
  --uuid your-mapping-uuid \
  --tumbling-window-in-seconds 60
```

## Handling KPL Aggregated Records

If your producers use the Kinesis Producer Library (KPL), records are aggregated. You need to deaggregate them in your Lambda function.

This deaggregates KPL records before processing them.

```python
import aws_kinesis_agg.deaggregator as deagg
import base64
import json

def handler(event, context):
    # Deaggregate KPL records
    raw_records = event['Records']
    user_records = deagg.deaggregate_records(raw_records)

    print(f"Received {len(raw_records)} Kinesis records, "
          f"deaggregated to {len(user_records)} user records")

    for record in user_records:
        data = json.loads(record['kinesis']['data'])
        process_event(data)
```

Install the deaggregation library in your Lambda deployment package.

```bash
pip install aws-kinesis-agg -t ./package/
```

## Lambda Function Configuration

Size your Lambda function appropriately. Memory allocation directly affects CPU allocation.

```bash
aws lambda update-function-configuration \
  --function-name process-user-events \
  --memory-size 512 \
  --timeout 300 \
  --environment '{
    "Variables": {
      "TABLE_NAME": "processed-events",
      "REGION": "us-east-1"
    }
  }'
```

For Kinesis processing, 512 MB to 1024 MB is usually sufficient. The timeout should be long enough to process the maximum batch size - if you're processing 10,000 records per batch, you might need a few minutes.

## Monitoring Lambda-Kinesis Integration

Track these CloudWatch metrics to understand your processing performance:

- **IteratorAge** - How far behind your Lambda consumer is
- **Duration** - How long each invocation takes
- **Errors** - Failed invocations
- **Throttles** - Lambda throttling due to concurrency limits
- **ConcurrentExecutions** - Active Lambda invocations

```bash
# Check iterator age - the most important metric
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name IteratorAge \
  --dimensions Name=FunctionName,Value=process-user-events \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Maximum
```

If iterator age is growing, your Lambda can't keep up. Increase the parallelization factor, increase batch size, optimize your function, or add more shards to the stream. For more on monitoring data pipelines, check out our post on [configuring Kinesis Data Streams](https://oneuptime.com/blog/post/configure-amazon-kinesis-data-streams/view).

## Common Pitfalls

1. **Don't use TRIM_HORIZON in production without thinking.** If your stream has days of data, Lambda will try to process all of it, potentially hitting concurrency limits.

2. **Watch your Lambda concurrency.** Each shard multiplied by the parallelization factor uses one concurrent execution. Make sure you haven't set a function-level concurrency limit that's too low.

3. **Set a reasonable maximum-record-age.** Without it, Lambda will keep retrying old records forever when it can't process them.

4. **Use batch item failures.** The old pattern of failing the entire batch and retrying everything is wasteful. Report individual failures instead.

5. **Don't forget about idempotency.** Records can be delivered more than once due to retries. Your processing logic needs to handle duplicates.

Lambda and Kinesis work really well together for serverless stream processing. The key is tuning those event source mapping parameters to match your workload - get the batch size, parallelization, and error handling right, and the rest takes care of itself.
