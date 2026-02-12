# How to Use Kinesis Data Streams On-Demand Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Kinesis, Streaming, Data Engineering

Description: Learn how to use Kinesis Data Streams on-demand mode for automatic capacity management without manual shard provisioning or scaling.

---

Provisioning the right number of shards for a Kinesis Data Stream has always been a guessing game. Provision too few and you get throttled during traffic spikes. Provision too many and you're paying for capacity you're not using. Kinesis on-demand mode takes this problem off your plate by automatically scaling the number of shards based on your actual throughput.

You don't set a shard count. You don't configure auto-scaling policies. You just send data and Kinesis handles the rest.

## How On-Demand Mode Works

In on-demand mode, Kinesis starts with a baseline capacity and automatically scales up as your throughput increases. It can handle up to double your previous peak write throughput within seconds, and if you sustain a new higher throughput, it adjusts the baseline upward.

The key numbers:
- Default capacity: 4 MB/s write and 8 MB/s read (equivalent to about 4 shards)
- Scale up: Accommodates up to 2x previous peak within 15 minutes
- Scale down: Gradual, over a 24-hour period
- Maximum: Same limits as provisioned mode (account-level shard limits apply)

## Creating an On-Demand Stream

Creating an on-demand stream is simpler than provisioned because you skip the shard count:

```bash
# Create a Kinesis stream in on-demand mode
# No need to specify shard count - Kinesis manages capacity automatically
aws kinesis create-stream \
    --stream-name "orders-stream" \
    --stream-mode-details '{"StreamMode": "ON_DEMAND"}'
```

That's it. Compare this to provisioned mode where you'd also need to specify `--shard-count`.

## Switching an Existing Stream to On-Demand

If you already have a provisioned stream, you can switch it to on-demand:

```bash
# Switch an existing provisioned stream to on-demand mode
aws kinesis update-stream-mode \
    --stream-arn "arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream" \
    --stream-mode-details '{"StreamMode": "ON_DEMAND"}'
```

And the reverse, if you want to switch back:

```bash
# Switch back to provisioned mode with a specific shard count
aws kinesis update-stream-mode \
    --stream-arn "arn:aws:kinesis:us-east-1:123456789012:stream/orders-stream" \
    --stream-mode-details '{"StreamMode": "PROVISIONED"}'

# Then set the shard count
aws kinesis update-shard-count \
    --stream-name "orders-stream" \
    --target-shard-count 10 \
    --scaling-type "UNIFORM_SCALING"
```

You can switch between modes twice in a 24-hour period, so don't stress about getting it wrong.

## Producing to an On-Demand Stream

The producer code is identical whether you're using on-demand or provisioned mode. Kinesis handles the scaling transparently:

```python
# Producing records to an on-demand Kinesis stream
# The code is exactly the same as with provisioned mode
import boto3
import json
import time
from datetime import datetime

kinesis = boto3.client('kinesis', region_name='us-east-1')

def send_order_event(order):
    """Send an order event to the Kinesis stream."""
    response = kinesis.put_record(
        StreamName='orders-stream',
        Data=json.dumps(order),
        PartitionKey=str(order['customer_id'])
    )
    return response

# Simulate a burst of orders
for i in range(1000):
    order = {
        'order_id': f'ORD-{i:06d}',
        'customer_id': i % 100,
        'product': 'Widget Pro',
        'quantity': 1,
        'price': 29.99,
        'timestamp': datetime.utcnow().isoformat()
    }
    response = send_order_event(order)
    print(f"Sent order {order['order_id']} to shard {response['ShardId']}")
```

For higher throughput, use `PutRecords` for batch writes:

```python
# Batch put for higher throughput
# PutRecords can handle up to 500 records per call
def send_order_batch(orders):
    records = []
    for order in orders:
        records.append({
            'Data': json.dumps(order),
            'PartitionKey': str(order['customer_id'])
        })

    # PutRecords handles up to 500 records or 5 MB per call
    response = kinesis.put_records(
        StreamName='orders-stream',
        Records=records
    )

    # Check for failed records and retry them
    failed_count = response['FailedRecordCount']
    if failed_count > 0:
        failed_records = []
        for i, record_result in enumerate(response['Records']):
            if 'ErrorCode' in record_result:
                failed_records.append(records[i])
        if failed_records:
            print(f"Retrying {len(failed_records)} failed records")
            time.sleep(1)  # Back off before retry
            send_order_batch([json.loads(r['Data']) for r in failed_records])

    return response
```

## Monitoring On-Demand Capacity

Even though Kinesis manages scaling automatically, you should still monitor your stream to understand its behavior:

```bash
# Check the current stream details including shard count
aws kinesis describe-stream-summary \
    --stream-name "orders-stream"
```

The response includes `OpenShardCount`, which tells you how many shards Kinesis has currently provisioned for your stream.

Key CloudWatch metrics to watch:

```bash
# Check write throttling - should be 0 in on-demand mode
aws cloudwatch get-metric-statistics \
    --namespace "AWS/Kinesis" \
    --metric-name "WriteProvisionedThroughputExceeded" \
    --dimensions Name=StreamName,Value=orders-stream \
    --start-time 2026-02-11T00:00:00Z \
    --end-time 2026-02-12T00:00:00Z \
    --period 300 \
    --statistics Sum

# Check incoming data throughput
aws cloudwatch get-metric-statistics \
    --namespace "AWS/Kinesis" \
    --metric-name "IncomingBytes" \
    --dimensions Name=StreamName,Value=orders-stream \
    --start-time 2026-02-11T00:00:00Z \
    --end-time 2026-02-12T00:00:00Z \
    --period 300 \
    --statistics Sum

# Check incoming record count
aws cloudwatch get-metric-statistics \
    --namespace "AWS/Kinesis" \
    --metric-name "IncomingRecords" \
    --dimensions Name=StreamName,Value=orders-stream \
    --start-time 2026-02-11T00:00:00Z \
    --end-time 2026-02-12T00:00:00Z \
    --period 300 \
    --statistics Sum
```

## On-Demand vs Provisioned: When to Choose What

**Choose on-demand when:**
- Your traffic is unpredictable or spiky
- You don't want to manage shard scaling
- You're building a new application and don't know your traffic patterns yet
- You have variable workloads (like event-driven architectures)
- Your team doesn't have dedicated ops support for Kinesis

**Choose provisioned when:**
- Your traffic is steady and predictable
- You want to optimize costs (provisioned is cheaper at steady-state)
- You need more than the on-demand scaling speed
- You're running at very high throughput consistently

## Cost Comparison

On-demand mode charges per GB of data written and read, plus a per-stream-hour charge. Provisioned mode charges per shard-hour. At steady-state with predictable traffic, provisioned is typically 15-20% cheaper. But when you factor in over-provisioning to handle spikes (which is what most people do), on-demand often comes out cheaper.

Here's a rough comparison:

```
Scenario: 5 MB/s average write throughput, with 15 MB/s spikes

Provisioned approach:
- Need 15 shards to handle peaks (1 MB/s write per shard)
- But average usage only needs 5 shards
- Paying for 15 shards 24/7

On-demand approach:
- Scales from ~5 shards to ~15 shards during peaks
- Scales back down after peaks
- Pay based on actual data throughput
```

## Using CloudFormation for On-Demand Streams

Here's a CloudFormation template:

```yaml
# CloudFormation template for an on-demand Kinesis stream
Resources:
  OrdersStream:
    Type: AWS::Kinesis::Stream
    Properties:
      Name: orders-stream
      StreamModeDetails:
        StreamMode: ON_DEMAND
      RetentionPeriodHours: 168
      StreamEncryption:
        EncryptionType: KMS
        KeyId: alias/aws/kinesis
      Tags:
        - Key: Environment
          Value: production
        - Key: Team
          Value: data-engineering
```

On-demand mode is the easier starting point for most new Kinesis streams. You can always switch to provisioned later if you need to optimize costs once you understand your traffic patterns. For dedicated per-consumer throughput, combine on-demand with [enhanced fan-out](https://oneuptime.com/blog/post/kinesis-data-streams-enhanced-fan-out/view), and for operational visibility, set up [CloudWatch monitoring for Kinesis](https://oneuptime.com/blog/post/monitor-kinesis-data-streams-cloudwatch/view).
