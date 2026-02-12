# How to Put Records into Kinesis Data Streams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Kinesis, Streaming, Data Ingestion

Description: Learn how to write records to Amazon Kinesis Data Streams using the AWS SDK, KPL, and the Kinesis Agent with proper error handling and throughput optimization.

---

You've got a Kinesis stream set up. Now you need to get data into it. There are several ways to put records into Kinesis, each with different trade-offs around throughput, latency, and complexity. This post covers all of them so you can pick the right approach for your use case.

## The Basics: PutRecord API

The simplest way to send a single record to Kinesis is the `PutRecord` API. It sends one record at a time and is great for low-volume or sporadic writes.

This Python example sends a single event record to a Kinesis stream.

```python
import boto3
import json
import time

kinesis = boto3.client('kinesis', region_name='us-east-1')

# Send a single record
event = {
    "userId": "user-456",
    "eventType": "page_view",
    "page": "/products/widget-a",
    "timestamp": int(time.time())
}

response = kinesis.put_record(
    StreamName='user-events',
    Data=json.dumps(event),
    PartitionKey=event['userId']
)

print(f"Shard: {response['ShardId']}, Sequence: {response['SequenceNumber']}")
```

The partition key determines which shard the record lands on. Kinesis hashes the partition key and maps it to a shard. Use a key with high cardinality (like user ID) to distribute records evenly across shards.

## Batch Writes: PutRecords API

For higher throughput, use `PutRecords` to send up to 500 records in a single API call. This is significantly more efficient than calling `PutRecord` in a loop.

This sends a batch of records and handles partial failures.

```python
import boto3
import json
import time

kinesis = boto3.client('kinesis', region_name='us-east-1')

def put_records_batch(stream_name, records):
    """Send records in batches of 500, handling partial failures."""
    kinesis_records = []

    for record in records:
        kinesis_records.append({
            'Data': json.dumps(record),
            'PartitionKey': record['userId']
        })

    # Send in chunks of 500
    for i in range(0, len(kinesis_records), 500):
        batch = kinesis_records[i:i+500]
        response = kinesis.put_records(
            StreamName=stream_name,
            Records=batch
        )

        # Handle partial failures
        if response['FailedRecordCount'] > 0:
            failed = []
            for idx, result in enumerate(response['Records']):
                if 'ErrorCode' in result:
                    failed.append(batch[idx])
                    print(f"Failed: {result['ErrorCode']} - {result['ErrorMessage']}")

            # Retry failed records with exponential backoff
            if failed:
                retry_records(stream_name, failed)

def retry_records(stream_name, records, max_retries=3):
    """Retry failed records with exponential backoff."""
    for attempt in range(max_retries):
        time.sleep(2 ** attempt)  # 1, 2, 4 seconds

        response = kinesis.put_records(
            StreamName=stream_name,
            Records=records
        )

        if response['FailedRecordCount'] == 0:
            return

        # Filter to only the still-failing records
        records = [
            records[idx] for idx, result in enumerate(response['Records'])
            if 'ErrorCode' in result
        ]

    print(f"Gave up on {len(records)} records after {max_retries} retries")

# Generate sample events
events = [
    {
        "userId": f"user-{i}",
        "eventType": "click",
        "timestamp": int(time.time())
    }
    for i in range(2000)
]

put_records_batch('user-events', events)
```

Partial failures are common during traffic spikes. The `FailedRecordCount` in the response tells you how many records didn't make it. Always implement retry logic.

## Kinesis Producer Library (KPL)

For high-throughput production use cases, the KPL is the way to go. It adds two critical features that the raw SDK doesn't have:

- **Aggregation** - Combines multiple user records into a single Kinesis record to reduce API calls
- **Collection** - Batches records and sends them in bulk

The KPL is a Java/C++ native library. Here's how to use it in Java.

This Java example sets up a KPL producer with aggregation and collection enabled.

```java
import com.amazonaws.services.kinesis.producer.KinesisProducer;
import com.amazonaws.services.kinesis.producer.KinesisProducerConfiguration;
import com.amazonaws.services.kinesis.producer.UserRecordResult;
import com.google.common.util.concurrent.FutureCallback;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

// Configure the KPL
KinesisProducerConfiguration config = new KinesisProducerConfiguration()
    .setRegion("us-east-1")
    .setMaxConnections(24)
    .setRequestTimeout(60000)
    .setRecordMaxBufferedTime(100)  // Max time to buffer before sending (ms)
    .setAggregationEnabled(true)
    .setAggregationMaxCount(100)    // Max records per aggregated record
    .setCollectionMaxCount(500);    // Max records per PutRecords call

KinesisProducer producer = new KinesisProducer(config);

// Send records asynchronously
for (int i = 0; i < 100000; i++) {
    String data = String.format(
        "{\"userId\":\"user-%d\",\"event\":\"pageview\",\"ts\":%d}",
        i % 1000, System.currentTimeMillis()
    );

    ByteBuffer payload = ByteBuffer.wrap(data.getBytes(StandardCharsets.UTF_8));
    String partitionKey = "user-" + (i % 1000);

    ListenableFuture<UserRecordResult> future = producer.addUserRecord(
        "user-events",
        partitionKey,
        payload
    );

    // Add callback for success/failure handling
    Futures.addCallback(future, new FutureCallback<UserRecordResult>() {
        @Override
        public void onSuccess(UserRecordResult result) {
            // Record was successfully sent
        }

        @Override
        public void onFailure(Throwable t) {
            System.err.println("Failed to send record: " + t.getMessage());
        }
    }, executor);
}

// Flush remaining records before shutdown
producer.flushSync();
producer.destroy();
```

The KPL can handle millions of records per second. The `RecordMaxBufferedTime` parameter controls the trade-off between latency and throughput - lower values mean lower latency but more API calls.

## Using KPL from Python

If you're working in Python, you can still use the KPL through the `aws-kinesis-agg` library for aggregation, then send the aggregated records via the standard SDK.

This Python example uses the aws-kinesis-agg library to aggregate records before sending.

```python
import aws_kinesis_agg.aggregator as agg
import boto3
import json
import time

kinesis = boto3.client('kinesis', region_name='us-east-1')
aggregator = agg.RecordAggregator()

def send_aggregated(agg_record):
    """Callback to send an aggregated record to Kinesis."""
    pk, ehk, data = agg_record.get_contents()
    kinesis.put_record(
        StreamName='user-events',
        Data=data,
        PartitionKey=pk,
        ExplicitHashKey=ehk
    )

# Set the callback
aggregator.on_record_complete(send_aggregated)

# Add records - they'll be automatically aggregated and sent
for i in range(10000):
    event = json.dumps({
        "userId": f"user-{i % 500}",
        "action": "click",
        "timestamp": int(time.time())
    })

    aggregator.add_user_record(
        partition_key=f"user-{i % 500}",
        data=event.encode('utf-8')
    )

# Flush any remaining records
remaining = aggregator.clear_and_get()
if remaining:
    send_aggregated(remaining)
```

## Kinesis Agent

For streaming log files directly into Kinesis, the Kinesis Agent is the simplest option. It's a standalone Java application that monitors files and sends new data to your stream.

Install and configure the agent on your server.

```bash
# Install the Kinesis Agent
sudo yum install -y aws-kinesis-agent
```

This is the agent configuration file that tails a log file and sends records to Kinesis.

```json
{
  "cloudwatch.emitMetrics": true,
  "kinesis.endpoint": "kinesis.us-east-1.amazonaws.com",
  "flows": [
    {
      "filePattern": "/var/log/app/events.log",
      "kinesisStream": "user-events",
      "partitionKeyOption": "RANDOM",
      "dataProcessingOptions": [
        {
          "optionName": "CSVTOJSON",
          "customFieldNames": ["timestamp", "userId", "eventType", "page"]
        }
      ]
    },
    {
      "filePattern": "/var/log/app/access.log",
      "kinesisStream": "access-logs",
      "partitionKeyOption": "RANDOM"
    }
  ]
}
```

Start the agent.

```bash
sudo service aws-kinesis-agent start
```

## Choosing the Right Partition Key

Your choice of partition key affects data distribution across shards. Poor choices lead to hot shards.

Bad partition keys:
- Constants (everything goes to one shard)
- Low-cardinality values like country code
- Timestamps (sequential, so they hash to the same shard range)

Good partition keys:
- User IDs
- Device IDs
- Session IDs
- Random UUIDs (if ordering doesn't matter)

If you need ordering guarantees for a specific entity (like all events for user-123 in order), use that entity's ID as the partition key.

## Handling Throttling

When you exceed a shard's write capacity, Kinesis returns a `ProvisionedThroughputExceededException`. Your code needs to handle this.

This implements exponential backoff specifically for throughput exceptions.

```python
import time
from botocore.exceptions import ClientError

def put_record_with_backoff(kinesis, stream_name, data, partition_key, max_retries=5):
    """Put a record with exponential backoff on throttling."""
    for attempt in range(max_retries):
        try:
            return kinesis.put_record(
                StreamName=stream_name,
                Data=data,
                PartitionKey=partition_key
            )
        except ClientError as e:
            if e.response['Error']['Code'] == 'ProvisionedThroughputExceededException':
                wait = min(2 ** attempt * 0.1, 10)  # Max 10 second wait
                print(f"Throttled, retrying in {wait}s (attempt {attempt + 1})")
                time.sleep(wait)
            else:
                raise

    raise Exception(f"Failed after {max_retries} retries")
```

If you're consistently getting throttled, it's time to add more shards or switch to on-demand mode. For help setting up your stream, check out our guide on [configuring Amazon Kinesis Data Streams](https://oneuptime.com/blog/post/configure-amazon-kinesis-data-streams/view).

## Performance Tips

1. **Use PutRecords over PutRecord.** The batch API is dramatically more efficient.
2. **Enable KPL aggregation** for high-throughput producers. It can pack hundreds of logical records into a single Kinesis record.
3. **Buffer on the client side.** Collect records for a short period before sending. The KPL does this automatically.
4. **Monitor IncomingBytes and IncomingRecords** per shard to detect hot shards early.
5. **Size your records appropriately.** The max record size is 1 MB, but smaller records mean better throughput per shard.

Getting data into Kinesis efficiently is mostly about batching, retry logic, and partition key selection. Start with `PutRecords` for moderate throughput, upgrade to KPL when you need serious volume, and always handle partial failures.
