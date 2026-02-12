# How to Monitor Kinesis Data Streams with CloudWatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Kinesis, CloudWatch, Monitoring

Description: A practical guide to monitoring Amazon Kinesis Data Streams using CloudWatch metrics, alarms, and dashboards to catch throughput issues before they cause data loss.

---

Kinesis Data Streams can silently lose data if producers get throttled and don't handle errors properly. The stream keeps running, your consumers keep processing, but some records never make it in. That's why monitoring isn't optional - it's essential. CloudWatch gives you all the metrics you need to stay ahead of problems.

This guide covers the metrics that actually matter, how to set up useful alarms, and building a dashboard that gives you real-time visibility into your streaming pipeline.

## Key Metrics to Monitor

Kinesis publishes two levels of metrics to CloudWatch:

- **Basic (stream-level)** - Free, enabled by default, 5-minute granularity
- **Enhanced (shard-level)** - Additional cost, 1-minute granularity, opt-in

For production workloads, enhanced metrics are worth the cost. Enable them:

```bash
# Enable enhanced monitoring for shard-level metrics
aws kinesis enable-enhanced-monitoring \
    --stream-name "orders-stream" \
    --shard-level-metrics ALL
```

Here are the metrics you should care about:

### Producer-Side Metrics

**IncomingBytes/IncomingRecords** - How much data is being written to the stream. Watch for sudden drops that might indicate a producer failure.

**WriteProvisionedThroughputExceeded** - This is the critical one. If this metric is non-zero, your producers are getting throttled. Records are being rejected, and unless your producers retry properly, you're losing data.

**PutRecord.Success/PutRecords.Success** - Success rate for write operations.

### Consumer-Side Metrics

**GetRecords.IteratorAgeMilliseconds** - How far behind your consumers are from the latest data. If this number is growing, your consumers can't keep up with the incoming data rate.

**ReadProvisionedThroughputExceeded** - Your consumers are hitting the read throughput limit. Consider enhanced fan-out if you have multiple consumers.

**GetRecords.Bytes/GetRecords.Records** - How much data consumers are reading. A sudden drop might indicate a consumer crash.

## Setting Up Alarms

Here are the alarms every Kinesis stream should have:

```bash
# CRITICAL: Alert when producers are being throttled
# Any throttling means potential data loss
aws cloudwatch put-metric-alarm \
    --alarm-name "kinesis-orders-write-throttled" \
    --alarm-description "Producers are being throttled on orders-stream" \
    --namespace "AWS/Kinesis" \
    --metric-name "WriteProvisionedThroughputExceeded" \
    --dimensions Name=StreamName,Value=orders-stream \
    --statistic Sum \
    --period 60 \
    --evaluation-periods 1 \
    --threshold 0 \
    --comparison-operator GreaterThanThreshold \
    --alarm-actions "arn:aws:sns:us-east-1:123456789012:critical-alerts" \
    --treat-missing-data "notBreaching"
```

```bash
# WARNING: Alert when consumer lag exceeds 5 minutes
# Growing lag means consumers can not keep up
aws cloudwatch put-metric-alarm \
    --alarm-name "kinesis-orders-consumer-lag" \
    --alarm-description "Consumer iterator age exceeding 5 minutes" \
    --namespace "AWS/Kinesis" \
    --metric-name "GetRecords.IteratorAgeMilliseconds" \
    --dimensions Name=StreamName,Value=orders-stream \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 3 \
    --threshold 300000 \
    --comparison-operator GreaterThanThreshold \
    --alarm-actions "arn:aws:sns:us-east-1:123456789012:warning-alerts" \
    --treat-missing-data "notBreaching"
```

```bash
# CRITICAL: Alert when consumer lag exceeds 1 hour
# At this point you might hit the retention limit
aws cloudwatch put-metric-alarm \
    --alarm-name "kinesis-orders-critical-lag" \
    --alarm-description "Consumer lag exceeding 1 hour - risk of data loss" \
    --namespace "AWS/Kinesis" \
    --metric-name "GetRecords.IteratorAgeMilliseconds" \
    --dimensions Name=StreamName,Value=orders-stream \
    --statistic Maximum \
    --period 60 \
    --evaluation-periods 5 \
    --threshold 3600000 \
    --comparison-operator GreaterThanThreshold \
    --alarm-actions "arn:aws:sns:us-east-1:123456789012:critical-alerts" \
    --treat-missing-data "notBreaching"
```

```bash
# WARNING: Alert when incoming data drops significantly
# Could indicate a producer failure
aws cloudwatch put-metric-alarm \
    --alarm-name "kinesis-orders-low-incoming" \
    --alarm-description "Incoming record rate has dropped below expected minimum" \
    --namespace "AWS/Kinesis" \
    --metric-name "IncomingRecords" \
    --dimensions Name=StreamName,Value=orders-stream \
    --statistic Sum \
    --period 300 \
    --evaluation-periods 3 \
    --threshold 100 \
    --comparison-operator LessThanThreshold \
    --alarm-actions "arn:aws:sns:us-east-1:123456789012:warning-alerts" \
    --treat-missing-data "breaching"
```

Note the `treat-missing-data` on that last one is set to "breaching" instead of "notBreaching". If you're not receiving any metrics at all, that's worse than low numbers.

## Per-Shard Monitoring

With enhanced monitoring enabled, you can detect hot shards - shards receiving disproportionately more data than others:

```bash
# Check write throughput per shard to detect hot shards
aws cloudwatch get-metric-data \
    --metric-data-queries '[
        {
            "Id": "incoming_bytes",
            "MetricStat": {
                "Metric": {
                    "Namespace": "AWS/Kinesis",
                    "MetricName": "IncomingBytes",
                    "Dimensions": [
                        {"Name": "StreamName", "Value": "orders-stream"},
                        {"Name": "ShardId", "Value": "shardId-000000000000"}
                    ]
                },
                "Period": 60,
                "Stat": "Sum"
            }
        },
        {
            "Id": "incoming_bytes_shard1",
            "MetricStat": {
                "Metric": {
                    "Namespace": "AWS/Kinesis",
                    "MetricName": "IncomingBytes",
                    "Dimensions": [
                        {"Name": "StreamName", "Value": "orders-stream"},
                        {"Name": "ShardId", "Value": "shardId-000000000001"}
                    ]
                },
                "Period": 60,
                "Stat": "Sum"
            }
        }
    ]' \
    --start-time 2026-02-12T00:00:00Z \
    --end-time 2026-02-12T12:00:00Z
```

Hot shards happen when your partition key isn't distributing records evenly. If one shard is getting 5x the traffic of others, you need a better partition key strategy.

## Building a CloudWatch Dashboard

Create a dashboard that gives you everything at a glance:

```bash
# Create a comprehensive Kinesis monitoring dashboard
aws cloudwatch put-dashboard \
    --dashboard-name "Kinesis-Orders-Stream" \
    --dashboard-body '{
    "widgets": [
        {
            "type": "metric",
            "x": 0, "y": 0, "width": 12, "height": 6,
            "properties": {
                "title": "Write Throughput",
                "metrics": [
                    ["AWS/Kinesis", "IncomingBytes", "StreamName", "orders-stream", {"stat": "Sum", "period": 60, "label": "Incoming Bytes"}],
                    ["AWS/Kinesis", "IncomingRecords", "StreamName", "orders-stream", {"stat": "Sum", "period": 60, "label": "Incoming Records", "yAxis": "right"}]
                ],
                "view": "timeSeries",
                "region": "us-east-1",
                "period": 60
            }
        },
        {
            "type": "metric",
            "x": 12, "y": 0, "width": 12, "height": 6,
            "properties": {
                "title": "Write Throttling (should be 0)",
                "metrics": [
                    ["AWS/Kinesis", "WriteProvisionedThroughputExceeded", "StreamName", "orders-stream", {"stat": "Sum", "period": 60, "color": "#d62728"}]
                ],
                "view": "timeSeries",
                "region": "us-east-1"
            }
        },
        {
            "type": "metric",
            "x": 0, "y": 6, "width": 12, "height": 6,
            "properties": {
                "title": "Consumer Lag (Iterator Age)",
                "metrics": [
                    ["AWS/Kinesis", "GetRecords.IteratorAgeMilliseconds", "StreamName", "orders-stream", {"stat": "Maximum", "period": 60, "color": "#ff7f0e"}]
                ],
                "view": "timeSeries",
                "region": "us-east-1",
                "annotations": {
                    "horizontal": [
                        {"label": "5 min warning", "value": 300000, "color": "#ff9900"},
                        {"label": "1 hour critical", "value": 3600000, "color": "#d62728"}
                    ]
                }
            }
        },
        {
            "type": "metric",
            "x": 12, "y": 6, "width": 12, "height": 6,
            "properties": {
                "title": "Read Throughput",
                "metrics": [
                    ["AWS/Kinesis", "GetRecords.Bytes", "StreamName", "orders-stream", {"stat": "Sum", "period": 60}],
                    ["AWS/Kinesis", "GetRecords.Records", "StreamName", "orders-stream", {"stat": "Sum", "period": 60, "yAxis": "right"}]
                ],
                "view": "timeSeries",
                "region": "us-east-1"
            }
        },
        {
            "type": "metric",
            "x": 0, "y": 12, "width": 24, "height": 3,
            "properties": {
                "title": "Success Rates",
                "metrics": [
                    ["AWS/Kinesis", "PutRecord.Success", "StreamName", "orders-stream", {"stat": "Average", "period": 60}],
                    ["AWS/Kinesis", "PutRecords.Success", "StreamName", "orders-stream", {"stat": "Average", "period": 60}],
                    ["AWS/Kinesis", "GetRecords.Success", "StreamName", "orders-stream", {"stat": "Average", "period": 60}]
                ],
                "view": "timeSeries",
                "region": "us-east-1"
            }
        }
    ]
}'
```

## Automating Responses

You can combine CloudWatch alarms with Lambda for automated remediation. For example, auto-scaling shards when throttling is detected:

```python
# Lambda function triggered by CloudWatch alarm for auto-scaling shards
import boto3
import math

def lambda_handler(event, context):
    kinesis = boto3.client('kinesis')
    stream_name = 'orders-stream'

    # Get current shard count
    description = kinesis.describe_stream_summary(StreamName=stream_name)
    current_shards = description['StreamDescriptionSummary']['OpenShardCount']

    # Double the shard count (up to a max)
    new_shard_count = min(current_shards * 2, 100)

    kinesis.update_shard_count(
        StreamName=stream_name,
        TargetShardCount=new_shard_count,
        ScalingType='UNIFORM_SCALING'
    )

    return {
        'message': f'Scaled {stream_name} from {current_shards} to {new_shard_count} shards'
    }
```

Monitoring your Kinesis streams is non-negotiable for production workloads. The write throttling and consumer lag metrics are the two numbers you absolutely must track. For streams using on-demand mode, see [Kinesis on-demand mode](https://oneuptime.com/blog/post/kinesis-data-streams-on-demand-mode/view), and for dedicated consumer throughput, explore [enhanced fan-out](https://oneuptime.com/blog/post/kinesis-data-streams-enhanced-fan-out/view).
