# How to Configure Amazon Kinesis Data Streams

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Kinesis, Streaming, Data Engineering

Description: Complete guide to setting up and configuring Amazon Kinesis Data Streams for real-time data ingestion, including shard management, capacity planning, and monitoring.

---

Amazon Kinesis Data Streams is AWS's service for real-time data streaming. It sits at the center of many event-driven architectures, handling everything from clickstream data to IoT sensor readings to application logs. Getting the configuration right matters - underprovision and you'll drop data, overprovision and you'll waste money.

Let's go through setting up a stream, tuning it for your workload, and keeping it healthy in production.

## Creating a Stream

You have two capacity modes: on-demand and provisioned. On-demand automatically scales, while provisioned gives you explicit control over shard count.

This creates a provisioned stream with 4 shards.

```bash
aws kinesis create-stream \
  --stream-name user-events \
  --shard-count 4
```

For on-demand mode, which automatically handles scaling:

```bash
aws kinesis create-stream \
  --stream-name user-events \
  --stream-mode-details StreamMode=ON_DEMAND
```

Wait for the stream to become active before using it.

```bash
aws kinesis describe-stream-summary \
  --stream-name user-events \
  --query 'StreamDescriptionSummary.StreamStatus'
```

## Understanding Shards and Capacity

Each shard provides:
- **Write**: 1 MB/sec or 1,000 records/sec
- **Read**: 2 MB/sec (shared among all consumers using GetRecords) or 2 MB/sec per consumer (with enhanced fan-out)

So a 4-shard stream gives you 4 MB/sec write throughput and 8 MB/sec read throughput. Planning your shard count is basically a math problem.

Here's how to calculate the shards you need.

```python
import math

# Your workload parameters
records_per_second = 5000
avg_record_size_bytes = 500

# Calculate write throughput in MB/sec
write_throughput_mb = (records_per_second * avg_record_size_bytes) / (1024 * 1024)

# Calculate shards needed based on throughput
shards_by_throughput = math.ceil(write_throughput_mb / 1)  # 1 MB/sec per shard

# Calculate shards needed based on record count
shards_by_count = math.ceil(records_per_second / 1000)  # 1000 records/sec per shard

# Take the higher number
required_shards = max(shards_by_throughput, shards_by_count)
print(f"Required shards: {required_shards}")
# Output: Required shards: 5
```

## Configuring Stream Retention

By default, streams retain data for 24 hours. You can extend this up to 365 days, but it costs more.

This sets the retention period to 7 days.

```bash
aws kinesis increase-stream-retention-period \
  --stream-name user-events \
  --retention-period-hours 168
```

When would you want longer retention? A few scenarios:

- Replaying data after a consumer bug fix
- Running new consumers that need historical data
- Compliance requirements that mandate data availability
- Disaster recovery where consumers might be down for extended periods

## Enhanced Fan-Out

Regular Kinesis consumers share the 2 MB/sec read throughput per shard. If you have multiple consumers, they compete for bandwidth. Enhanced fan-out gives each registered consumer its own dedicated 2 MB/sec per shard.

Register a consumer for enhanced fan-out.

```bash
aws kinesis register-stream-consumer \
  --stream-arn arn:aws:kinesis:us-east-1:123456789:stream/user-events \
  --consumer-name analytics-processor
```

The tradeoff is cost. Enhanced fan-out charges per consumer-shard-hour plus per GB of data retrieved. It's worth it when you have 3+ consumers reading from the same stream.

## Encryption

Enable server-side encryption to protect data at rest.

This enables encryption using an AWS-managed KMS key.

```bash
aws kinesis start-stream-encryption \
  --stream-name user-events \
  --encryption-type KMS \
  --key-id alias/aws/kinesis
```

For a customer-managed key, replace the key ID with your KMS key ARN. Customer-managed keys give you more control over key rotation and access policies.

## Scaling Shards

When your throughput needs change, you need to update the shard count.

This doubles the shard count from 4 to 8 by splitting shards.

```bash
aws kinesis update-shard-count \
  --stream-name user-events \
  --target-shard-count 8 \
  --scaling-type UNIFORM_SCALING
```

Shard splits and merges take time - usually a few seconds per shard. During the resharding, your stream continues to accept records, but your consumers need to handle the transition. Most Kinesis client libraries handle this automatically.

Keep in mind that you can only double or halve the shard count in a single operation, and you're limited to certain resharding operations per 24-hour period.

## Monitoring with CloudWatch

Kinesis publishes several important metrics to CloudWatch. Here are the ones you should watch.

This creates CloudWatch alarms for critical Kinesis metrics.

```bash
# Alarm when write throughput exceeds 80% of capacity
aws cloudwatch put-metric-alarm \
  --alarm-name kinesis-write-throttle-warning \
  --metric-name WriteProvisionedThroughputExceeded \
  --namespace AWS/Kinesis \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=StreamName,Value=user-events \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts

# Alarm when iterator age gets too high (consumer falling behind)
aws cloudwatch put-metric-alarm \
  --alarm-name kinesis-iterator-age-warning \
  --metric-name GetRecords.IteratorAgeMilliseconds \
  --namespace AWS/Kinesis \
  --statistic Maximum \
  --period 300 \
  --threshold 60000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --dimensions Name=StreamName,Value=user-events \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

The key metrics to track:

| Metric | What It Tells You | Alert Threshold |
|--------|-------------------|-----------------|
| WriteProvisionedThroughputExceeded | Writes being throttled | > 0 sustained |
| ReadProvisionedThroughputExceeded | Reads being throttled | > 0 sustained |
| GetRecords.IteratorAgeMilliseconds | Consumer lag | > 60 seconds |
| IncomingBytes | Data ingestion rate | Approaching shard limits |
| IncomingRecords | Record ingestion rate | Approaching shard limits |

## Infrastructure as Code with CloudFormation

For production deployments, define your stream in CloudFormation.

This template creates a Kinesis stream with encryption and monitoring.

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  UserEventsStream:
    Type: AWS::Kinesis::Stream
    Properties:
      Name: user-events
      ShardCount: 4
      RetentionPeriodHours: 168
      StreamEncryption:
        EncryptionType: KMS
        KeyId: alias/aws/kinesis
      Tags:
        - Key: Environment
          Value: Production
        - Key: Team
          Value: DataEngineering

  WriteThrottleAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: user-events-write-throttle
      MetricName: WriteProvisionedThroughputExceeded
      Namespace: AWS/Kinesis
      Statistic: Sum
      Period: 300
      EvaluationPeriods: 2
      Threshold: 100
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - Name: StreamName
          Value: !Ref UserEventsStream
```

## Best Practices

A few things I've learned from running Kinesis in production:

1. **Start with on-demand mode** if you're not sure about your throughput patterns. Switch to provisioned once you understand your baseline.
2. **Use partition keys wisely.** Hot partition keys create hot shards. Distribute your keys evenly - don't use something like country code where one value dominates.
3. **Monitor iterator age religiously.** If it's growing, your consumers can't keep up and you need to scale either the stream or the consumer.
4. **Set up dead letter queues** for records that fail processing. Don't lose data just because a single record is malformed.
5. **Use enhanced fan-out** when you have multiple independent consumers reading the same stream.

For the next step, check out our guide on [putting records into Kinesis Data Streams](https://oneuptime.com/blog/post/2026-02-12-put-records-into-kinesis-data-streams/view) to start sending data to your newly configured stream.
