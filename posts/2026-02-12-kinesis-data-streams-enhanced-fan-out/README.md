# How to Use Kinesis Data Streams Enhanced Fan-Out

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Kinesis, Streaming, Data Engineering

Description: Learn how to use Kinesis Data Streams enhanced fan-out for dedicated throughput per consumer, eliminating the shared read throughput bottleneck.

---

Standard Kinesis Data Streams consumers share the read throughput of each shard. That means if a shard can deliver 2 MB/s and you have three consumers, each one effectively gets about 667 KB/s. That's a real bottleneck when you need multiple applications to process the same stream independently and at full speed.

Enhanced fan-out gives each registered consumer its own dedicated 2 MB/s read throughput per shard. And instead of polling for records, consumers receive data pushed to them via HTTP/2, which reduces latency from around 200ms to about 70ms.

## Standard vs Enhanced Fan-Out

Here's the difference at a glance:

| Feature | Standard Consumer | Enhanced Fan-Out Consumer |
|---------|------------------|--------------------------|
| Throughput per shard | 2 MB/s shared across all consumers | 2 MB/s dedicated per consumer |
| Delivery model | Pull (GetRecords API) | Push (SubscribeToShard API) |
| Latency | ~200ms average | ~70ms average |
| Max consumers | 5 per shard recommended | 20 per stream |
| Cost | Included in stream cost | Additional per-consumer, per-shard hour charge |

## Registering an Enhanced Fan-Out Consumer

First, register a consumer with the stream:

```bash
# Register an enhanced fan-out consumer
aws kinesis register-stream-consumer \
    --stream-arn "arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream" \
    --consumer-name "analytics-processor"

# Register a second consumer for the same stream
aws kinesis register-stream-consumer \
    --stream-arn "arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream" \
    --consumer-name "fraud-detector"

# Register a third consumer
aws kinesis register-stream-consumer \
    --stream-arn "arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream" \
    --consumer-name "real-time-dashboard"
```

Each of these consumers now gets their own dedicated 2 MB/s per shard. The analytics processor doesn't slow down the fraud detector, and neither affects the real-time dashboard.

Check consumer status:

```bash
# List all registered consumers for a stream
aws kinesis list-stream-consumers \
    --stream-arn "arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream"

# Get details about a specific consumer
aws kinesis describe-stream-consumer \
    --stream-arn "arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream" \
    --consumer-name "analytics-processor"
```

## Using Enhanced Fan-Out with KCL

The Kinesis Client Library (KCL) version 2.x supports enhanced fan-out natively. You just need to configure it to use the registered consumer:

```java
// KCL 2.x configuration for enhanced fan-out
// Uses push-based delivery via SubscribeToShard
import software.amazon.kinesis.processor.ShardRecordProcessorFactory;
import software.amazon.kinesis.common.ConfigsBuilder;
import software.amazon.kinesis.coordinator.Scheduler;

public class EnhancedFanOutApp {
    public static void main(String[] args) {
        String streamName = "orders-stream";
        String consumerName = "analytics-processor";
        String applicationName = "analytics-app";

        KinesisAsyncClient kinesisClient = KinesisAsyncClient.builder()
                .region(Region.US_EAST_1)
                .build();

        DynamoDbAsyncClient dynamoClient = DynamoDbAsyncClient.builder()
                .region(Region.US_EAST_1)
                .build();

        CloudWatchAsyncClient cloudWatchClient = CloudWatchAsyncClient.builder()
                .region(Region.US_EAST_1)
                .build();

        ConfigsBuilder configsBuilder = new ConfigsBuilder(
                streamName,
                applicationName,
                kinesisClient,
                dynamoClient,
                cloudWatchClient,
                UUID.randomUUID().toString(),
                new OrderProcessorFactory()
        );

        // Enable enhanced fan-out by setting the consumer name
        Scheduler scheduler = new Scheduler(
                configsBuilder.checkpointConfig(),
                configsBuilder.coordinatorConfig(),
                configsBuilder.leaseManagementConfig(),
                configsBuilder.lifecycleConfig(),
                configsBuilder.metricsConfig(),
                configsBuilder.processorConfig(),
                configsBuilder.retrievalConfig()
                        .retrievalSpecificConfig(
                                new FanOutConfig(kinesisClient)
                                        .streamName(streamName)
                                        .consumerName(consumerName)
                                        .applicationName(applicationName)
                        )
        );

        Thread schedulerThread = new Thread(scheduler);
        schedulerThread.setDaemon(true);
        schedulerThread.start();
    }
}
```

The record processor implementation stays the same whether you use standard or enhanced fan-out:

```java
// Record processor - same code for standard or enhanced fan-out
public class OrderProcessor implements ShardRecordProcessor {

    @Override
    public void initialize(InitializationInput initializationInput) {
        System.out.println("Initialized shard: " + initializationInput.shardId());
    }

    @Override
    public void processRecords(ProcessRecordsInput processRecordsInput) {
        for (KinesisClientRecord record : processRecordsInput.records()) {
            String data = StandardCharsets.UTF_8.decode(record.data()).toString();
            // Process the order record
            processOrder(data);
        }

        // Checkpoint after processing the batch
        try {
            processRecordsInput.checkpointer().checkpoint();
        } catch (Exception e) {
            System.err.println("Error checkpointing: " + e.getMessage());
        }
    }

    @Override
    public void leaseLost(LeaseLostInput leaseLostInput) {
        System.out.println("Lease lost");
    }

    @Override
    public void shardEnded(ShardEndedInput shardEndedInput) {
        try {
            shardEndedInput.checkpointer().checkpoint();
        } catch (Exception e) {
            System.err.println("Error on shard end: " + e.getMessage());
        }
    }

    @Override
    public void shutdownRequested(ShutdownRequestedInput shutdownRequestedInput) {
        try {
            shutdownRequestedInput.checkpointer().checkpoint();
        } catch (Exception e) {
            System.err.println("Error on shutdown: " + e.getMessage());
        }
    }
}
```

## Using Enhanced Fan-Out with Python

If you're using Python with boto3, you can subscribe to shards directly:

```python
# Python example using SubscribeToShard for enhanced fan-out
import boto3
import json

kinesis = boto3.client('kinesis', region_name='us-east-1')

# Get the consumer ARN
consumer_response = kinesis.describe_stream_consumer(
    StreamARN='arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream',
    ConsumerName='analytics-processor'
)
consumer_arn = consumer_response['ConsumerDescription']['ConsumerARN']

# List shards in the stream
stream_response = kinesis.list_shards(
    StreamName='orders-stream'
)

for shard in stream_response['Shards']:
    shard_id = shard['ShardId']

    # Subscribe to a shard with enhanced fan-out
    # This returns an event stream with records pushed to you
    response = kinesis.subscribe_to_shard(
        ConsumerARN=consumer_arn,
        ShardId=shard_id,
        StartingPosition={
            'Type': 'LATEST'
        }
    )

    # Process the event stream
    event_stream = response['EventStream']
    for event in event_stream:
        if 'SubscribeToShardEvent' in event:
            records = event['SubscribeToShardEvent']['Records']
            for record in records:
                data = json.loads(record['Data'])
                print(f"Received: {data}")
```

Note that `SubscribeToShard` connections last 5 minutes before you need to resubscribe. In production, you'll want to handle this reconnection logic or use the KCL which handles it for you.

## Lambda with Enhanced Fan-Out

AWS Lambda supports enhanced fan-out as an event source. This is probably the simplest way to use it:

```bash
# Create a Lambda event source mapping with enhanced fan-out
aws lambda create-event-source-mapping \
    --function-name "order-processor-function" \
    --event-source-arn "arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream" \
    --starting-position "LATEST" \
    --batch-size 100 \
    --maximum-batching-window-in-seconds 5 \
    --parallelization-factor 10 \
    --destination-config '{
        "OnFailure": {
            "Destination": "arn:aws:sqs:us-east-1:123456789012:order-processing-dlq"
        }
    }'
```

Wait - that's actually a standard consumer. To use enhanced fan-out with Lambda, you need to register the consumer first and reference it:

```bash
# Register a consumer for Lambda
aws kinesis register-stream-consumer \
    --stream-arn "arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream" \
    --consumer-name "lambda-processor"

# Then create the event source mapping pointing to the consumer ARN
aws lambda create-event-source-mapping \
    --function-name "order-processor-function" \
    --event-source-arn "arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream/consumer/lambda-processor:1234567890" \
    --starting-position "LATEST" \
    --batch-size 100
```

## When to Use Enhanced Fan-Out

You should use enhanced fan-out when:

- You have more than 2 consumers reading from the same stream
- Low latency matters (sub-100ms)
- Each consumer needs the full shard throughput
- You're seeing throttling errors with standard consumers

You probably don't need it when:

- You have a single consumer
- Cost is a primary concern (enhanced fan-out adds per-consumer costs)
- Latency in the 200ms range is acceptable

## Cost Considerations

Enhanced fan-out pricing has two components:
- Per consumer, per shard hour (check current AWS pricing)
- Per GB of data retrieved via enhanced fan-out

For a stream with 10 shards and 3 enhanced fan-out consumers, you're paying for 30 consumer-shard hours per hour. That adds up. Do the math before enabling it on every consumer.

For monitoring your Kinesis streams and enhanced fan-out consumers, check out [monitoring Kinesis with CloudWatch](https://oneuptime.com/blog/post/2026-02-12-monitor-kinesis-data-streams-cloudwatch/view).
