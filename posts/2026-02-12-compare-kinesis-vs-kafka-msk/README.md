# How to Compare Kinesis vs Kafka (MSK)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Kinesis, Kafka, MSK, Streaming

Description: An in-depth comparison of Amazon Kinesis and Amazon MSK (Managed Kafka) covering architecture, performance, cost, and use case fit to help you choose the right streaming platform.

---

"Should we use Kinesis or Kafka?" It's one of the most common questions teams ask when building streaming architectures on AWS. Both are managed services, both handle real-time data, and both can scale to massive throughput. But they're fundamentally different in how they work, what they cost, and what they're best at.

This isn't a "one is better than the other" post. It's an honest comparison so you can pick the right tool for your specific situation.

## Architecture Differences

### Kinesis Data Streams

Kinesis is a fully managed, proprietary AWS service. You interact with it through AWS APIs. The unit of scaling is a shard.

- Each shard handles 1 MB/sec writes and 2 MB/sec reads
- Data is retained for 24 hours by default (up to 365 days)
- Partition key determines shard assignment
- No broker management whatsoever
- Tight integration with Lambda, Firehose, and other AWS services

### Amazon MSK (Managed Kafka)

MSK runs actual Apache Kafka brokers on EC2 instances that AWS manages for you. You interact with it using the standard Kafka protocol and client libraries.

- Scaling is based on broker count and partition count
- Data retention is disk-based (limited by EBS volume size)
- Consumer groups manage offset tracking
- Standard Kafka ecosystem tools work out of the box
- You still manage topics, partitions, and some configuration

## Feature Comparison

Here's a side-by-side breakdown of the key differences.

| Feature | Kinesis Data Streams | Amazon MSK |
|---------|---------------------|------------|
| Protocol | AWS API | Kafka protocol |
| Scaling unit | Shards | Brokers + partitions |
| Max message size | 1 MB | 1 MB (configurable to higher) |
| Max retention | 365 days | Unlimited (disk-based) |
| Default retention | 24 hours | 7 days |
| Consumer model | GetRecords / Enhanced Fan-Out | Consumer groups |
| Ordering | Per shard | Per partition |
| Exactly-once | No (at-least-once) | Yes (with transactions) |
| Serverless option | Yes (On-Demand mode) | Yes (MSK Serverless) |
| Ecosystem | AWS-native | Full Kafka ecosystem |
| Client libraries | AWS SDK, KPL/KCL | Any Kafka client |
| Multi-region | Cross-region replication | MirrorMaker 2 |

## Throughput and Performance

Let's look at actual numbers.

### Kinesis Throughput

This Python script benchmarks Kinesis write throughput.

```python
import boto3
import json
import time

kinesis = boto3.client('kinesis', region_name='us-east-1')

# Benchmark: 4-shard stream
# Theoretical max: 4 MB/sec or 4000 records/sec
start = time.time()
batch_count = 0
record_count = 0

for _ in range(100):
    records = [
        {'Data': json.dumps({'id': i, 'ts': time.time()}) + '\n', 'PartitionKey': str(i % 100)}
        for i in range(500)
    ]
    response = kinesis.put_records(StreamName='benchmark-stream', Records=records)
    batch_count += 1
    record_count += 500 - response['FailedRecordCount']

elapsed = time.time() - start
print(f"Sent {record_count} records in {elapsed:.1f}s")
print(f"Throughput: {record_count/elapsed:.0f} records/sec")
# Typical result: ~3,500-4,000 records/sec with 4 shards
```

### Kafka (MSK) Throughput

```python
from kafka import KafkaProducer
import json
import time

producer = KafkaProducer(
    bootstrap_servers=['broker1:9092', 'broker2:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    batch_size=32768,
    linger_ms=10,
    compression_type='snappy'
)

start = time.time()
record_count = 0

for i in range(50000):
    producer.send('benchmark-topic', value={'id': i, 'ts': time.time()})
    record_count += 1

producer.flush()
elapsed = time.time() - start
print(f"Sent {record_count} records in {elapsed:.1f}s")
print(f"Throughput: {record_count/elapsed:.0f} records/sec")
# Typical result: 50,000-200,000+ records/sec depending on broker config
```

Kafka generally delivers higher throughput per dollar because it uses client-side batching more aggressively and doesn't have per-shard API limits. Kinesis caps each shard at 1,000 records/sec and 1 MB/sec regardless of how efficient your batching is.

## Cost Comparison

This is where things get interesting. Let's compare costs for a moderate workload: 10 MB/sec sustained write throughput, 168-hour retention.

### Kinesis Cost

```
Shards needed: 10 (10 MB/sec / 1 MB per shard)
Shard-hours: 10 shards x 730 hours = 7,300 shard-hours
Shard cost: 7,300 x $0.015 = $109.50/month

PUT payload units: 10 MB/sec = ~86,400,000 PUT units/day
Monthly PUTs: ~2.6 billion
PUT cost: 2,600 x $0.014 = $36.40/month

Extended retention (168h): 10 shards x $0.023 x 730 = $167.90/month

Total: ~$314/month
```

### MSK Cost

```
Brokers: 3 (minimum for production)
Instance type: kafka.m5.large
Broker cost: 3 x $0.21/hour x 730 = $459.90/month

Storage: 500 GB per broker (for 168h retention at 10 MB/sec)
Storage cost: 1,500 GB x $0.10 = $150/month

Total: ~$610/month
```

For this workload, Kinesis is cheaper. But the equation flips at higher throughput because MSK broker cost stays relatively fixed while Kinesis shard costs scale linearly.

## Consumer Differences

### Kinesis Consumers

Kinesis consumers are either Lambda-based (simplest), KCL-based (most control), or enhanced fan-out (best for multiple consumers).

```python
# Kinesis consumer with enhanced fan-out
import boto3

kinesis = boto3.client('kinesis', region_name='us-east-1')

# Subscribe to enhanced fan-out
response = kinesis.subscribe_to_shard(
    ConsumerARN='arn:aws:kinesis:us-east-1:123456789:stream/my-stream/consumer/my-app',
    ShardId='shardId-000000000000',
    StartingPosition={'Type': 'LATEST'}
)

for event in response['EventStream']:
    if 'SubscribeToShardEvent' in event:
        records = event['SubscribeToShardEvent']['Records']
        for record in records:
            process(record)
```

### Kafka (MSK) Consumers

Kafka consumers use the standard consumer group protocol. Any Kafka client library works.

```python
from kafka import KafkaConsumer
import json

consumer = KafkaConsumer(
    'user-events',
    bootstrap_servers=['broker1:9092', 'broker2:9092'],
    group_id='my-consumer-group',
    auto_offset_reset='latest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    enable_auto_commit=True
)

for message in consumer:
    process(message.value)
```

The Kafka consumer model is more mature and widely understood. Consumer groups handle partition assignment, offset tracking, and rebalancing automatically.

## When to Choose Kinesis

Pick Kinesis when:

- You want zero operational overhead
- Your team doesn't have Kafka experience
- You're heavily invested in AWS-native services (Lambda, Firehose)
- Your throughput is moderate (under 50 MB/sec)
- You need quick setup with minimal configuration
- You want to use Kinesis Data Analytics for SQL-based processing

## When to Choose MSK

Pick MSK when:

- Your team already knows Kafka
- You need the Kafka ecosystem (Kafka Connect, Schema Registry, KSQL)
- You need exactly-once processing semantics
- Your throughput is very high (100+ MB/sec)
- You need long-term data retention (weeks or months)
- You want to keep your code portable across cloud providers
- You need compact topics for changelog/state storage

## Migration Considerations

If you're currently on Kinesis and considering MSK, or vice versa, here's what to think about:

- **Producer changes** - Switching from Kinesis SDK to Kafka clients requires code changes in every producer
- **Consumer changes** - KCL-based consumers need to be rewritten for Kafka, and vice versa
- **Data migration** - You can't directly migrate data between them. Run both in parallel during migration
- **Monitoring** - Different metrics, different dashboards, different alerting

For setting up MSK, check out our guide on [setting up Amazon MSK](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-msk/view). For Kinesis deep dives, see our post on [configuring Kinesis Data Streams](https://oneuptime.com/blog/post/2026-02-12-configure-amazon-kinesis-data-streams/view).

## The Bottom Line

There's no universal answer. Kinesis is simpler to operate and integrates more tightly with AWS. MSK gives you the full power of the Kafka ecosystem and better throughput economics at scale. Many organizations actually use both - Kinesis for AWS-native integrations and MSK for their core data platform.

Start with Kinesis if you don't have strong Kafka experience and your requirements are straightforward. Start with MSK if you're already running Kafka or if you need features that Kinesis simply doesn't offer, like exactly-once semantics or the Kafka Connect framework.
