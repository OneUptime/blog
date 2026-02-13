# How to Configure S3 Bucket Metrics in CloudWatch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, CloudWatch, Monitoring

Description: Detailed guide to setting up S3 bucket metrics in CloudWatch, including request metrics, storage metrics, replication metrics, and creating alarms for operational visibility.

---

S3 gives you two categories of CloudWatch metrics: storage metrics (free, reported daily) and request metrics (optional, reported every minute). Most people only see the storage metrics and miss the request-level data that's actually useful for operational monitoring.

Let's configure both and set up meaningful alarms.

## Default Storage Metrics

These are available for every bucket without any configuration. CloudWatch reports them once per day.

- **BucketSizeBytes** - Total size of all objects in the bucket
- **NumberOfObjects** - Total count of objects

You can view them in the console or query them via CLI.

```bash
# Get the bucket size over the last 7 days
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BucketSizeBytes \
  --dimensions Name=BucketName,Value=my-data-bucket Name=StorageType,Value=StandardStorage \
  --start-time 2026-02-05T00:00:00Z \
  --end-time 2026-02-12T00:00:00Z \
  --period 86400 \
  --statistics Average
```

The StorageType dimension matters. You need to query each storage class separately.

```bash
# Get object count for Standard storage
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name NumberOfObjects \
  --dimensions Name=BucketName,Value=my-data-bucket Name=StorageType,Value=AllStorageTypes \
  --start-time 2026-02-05T00:00:00Z \
  --end-time 2026-02-12T00:00:00Z \
  --period 86400 \
  --statistics Average
```

## Enabling Request Metrics

Request metrics give you the good stuff: latency, error rates, request counts. But you need to enable them explicitly.

Enable request metrics for the entire bucket.

```bash
# Create a metrics configuration for all objects
aws s3api put-bucket-metrics-configuration \
  --bucket my-data-bucket \
  --id EntireBucket \
  --metrics-configuration '{
    "Id": "EntireBucket"
  }'
```

You can also create filtered configurations that only track metrics for specific prefixes or tags. This is useful when you want separate dashboards for different data categories.

```bash
# Metrics for objects with the 'uploads/' prefix
aws s3api put-bucket-metrics-configuration \
  --bucket my-data-bucket \
  --id UploadsPrefix \
  --metrics-configuration '{
    "Id": "UploadsPrefix",
    "Filter": {
      "Prefix": "uploads/"
    }
  }'

# Metrics for objects tagged with environment=production
aws s3api put-bucket-metrics-configuration \
  --bucket my-data-bucket \
  --id ProductionData \
  --metrics-configuration '{
    "Id": "ProductionData",
    "Filter": {
      "Tag": {
        "Key": "environment",
        "Value": "production"
      }
    }
  }'

# Combine prefix and tag filters
aws s3api put-bucket-metrics-configuration \
  --bucket my-data-bucket \
  --id ProductionUploads \
  --metrics-configuration '{
    "Id": "ProductionUploads",
    "Filter": {
      "And": {
        "Prefix": "uploads/",
        "Tags": [
          {
            "Key": "environment",
            "Value": "production"
          }
        ]
      }
    }
  }'
```

Metrics start appearing within 15 minutes of configuration. They're reported at 1-minute intervals.

## Available Request Metrics

Once enabled, you get these metrics in the AWS/S3 namespace:

**Request metrics:**
- **AllRequests** - Total number of HTTP requests
- **GetRequests** - Number of GET requests
- **PutRequests** - Number of PUT requests
- **DeleteRequests** - Number of DELETE requests
- **HeadRequests** - Number of HEAD requests
- **PostRequests** - Number of POST requests
- **SelectRequests** - Number of S3 Select requests
- **ListRequests** - Number of list requests

**Error metrics:**
- **4xxErrors** - Client error count
- **5xxErrors** - Server error count

**Performance metrics:**
- **FirstByteLatency** - Time from request received to first byte returned
- **TotalRequestLatency** - Total time to complete the request

**Data transfer metrics:**
- **BytesDownloaded** - Bytes downloaded from the bucket
- **BytesUploaded** - Bytes uploaded to the bucket

**Replication metrics (if replication is enabled):**
- **ReplicationLatency** - Time to replicate objects
- **BytesPendingReplication** - Bytes waiting to be replicated
- **OperationsPendingReplication** - Operations waiting to be replicated
- **OperationsFailedReplication** - Operations that failed to replicate

## Creating Alarms

Now that you've got metrics flowing, set up alarms for things that matter.

Alert when 5xx error rate exceeds a threshold. This usually indicates an S3 service issue.

```bash
# Alarm on 5xx errors
aws cloudwatch put-metric-alarm \
  --alarm-name s3-5xx-errors-my-data-bucket \
  --alarm-description "S3 5xx errors exceeded threshold" \
  --metric-name 5xxErrors \
  --namespace AWS/S3 \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions Name=BucketName,Value=my-data-bucket Name=FilterId,Value=EntireBucket \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts \
  --treat-missing-data notBreaching
```

Alert when latency spikes. High first byte latency means something's wrong.

```bash
# Alarm on high latency
aws cloudwatch put-metric-alarm \
  --alarm-name s3-high-latency-my-data-bucket \
  --alarm-description "S3 first byte latency exceeded 500ms" \
  --metric-name FirstByteLatency \
  --namespace AWS/S3 \
  --statistic p99 \
  --period 300 \
  --threshold 500 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --dimensions Name=BucketName,Value=my-data-bucket Name=FilterId,Value=EntireBucket \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

Alert on unusual request patterns. A sudden spike in requests might indicate abuse or a misconfigured application.

```bash
# Alarm on request spike
aws cloudwatch put-metric-alarm \
  --alarm-name s3-request-spike-my-data-bucket \
  --alarm-description "Unusual request volume detected" \
  --metric-name AllRequests \
  --namespace AWS/S3 \
  --statistic Sum \
  --period 300 \
  --threshold 10000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=BucketName,Value=my-data-bucket Name=FilterId,Value=EntireBucket \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

## Building a Dashboard

Create a CloudWatch dashboard to visualize your S3 metrics in one place.

```bash
# Create a dashboard with S3 metrics
aws cloudwatch put-dashboard \
  --dashboard-name S3-Operations \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "x": 0,
        "y": 0,
        "width": 12,
        "height": 6,
        "properties": {
          "metrics": [
            ["AWS/S3", "AllRequests", "BucketName", "my-data-bucket", "FilterId", "EntireBucket", {"stat": "Sum"}],
            [".", "4xxErrors", ".", ".", ".", ".", {"stat": "Sum"}],
            [".", "5xxErrors", ".", ".", ".", ".", {"stat": "Sum"}]
          ],
          "period": 300,
          "title": "Request Count and Errors",
          "view": "timeSeries"
        }
      },
      {
        "type": "metric",
        "x": 12,
        "y": 0,
        "width": 12,
        "height": 6,
        "properties": {
          "metrics": [
            ["AWS/S3", "FirstByteLatency", "BucketName", "my-data-bucket", "FilterId", "EntireBucket", {"stat": "p50"}],
            ["...", {"stat": "p99"}]
          ],
          "period": 300,
          "title": "First Byte Latency (p50 and p99)",
          "view": "timeSeries"
        }
      },
      {
        "type": "metric",
        "x": 0,
        "y": 6,
        "width": 12,
        "height": 6,
        "properties": {
          "metrics": [
            ["AWS/S3", "BytesDownloaded", "BucketName", "my-data-bucket", "FilterId", "EntireBucket", {"stat": "Sum"}],
            [".", "BytesUploaded", ".", ".", ".", ".", {"stat": "Sum"}]
          ],
          "period": 3600,
          "title": "Data Transfer",
          "view": "timeSeries"
        }
      },
      {
        "type": "metric",
        "x": 12,
        "y": 6,
        "width": 12,
        "height": 6,
        "properties": {
          "metrics": [
            ["AWS/S3", "BucketSizeBytes", "BucketName", "my-data-bucket", "StorageType", "StandardStorage"]
          ],
          "period": 86400,
          "title": "Bucket Size",
          "view": "timeSeries",
          "stat": "Average"
        }
      }
    ]
  }'
```

## Monitoring Multiple Buckets

For organizations with many buckets, you can use metric math to aggregate metrics across buckets.

```bash
# Use metric math to sum errors across buckets
aws cloudwatch put-metric-alarm \
  --alarm-name s3-total-5xx-errors \
  --alarm-description "Total 5xx errors across all monitored buckets" \
  --metrics '[
    {
      "Id": "bucket1",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/S3",
          "MetricName": "5xxErrors",
          "Dimensions": [
            {"Name": "BucketName", "Value": "bucket-one"},
            {"Name": "FilterId", "Value": "EntireBucket"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "bucket2",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/S3",
          "MetricName": "5xxErrors",
          "Dimensions": [
            {"Name": "BucketName", "Value": "bucket-two"},
            {"Name": "FilterId", "Value": "EntireBucket"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "total_errors",
      "Expression": "bucket1 + bucket2",
      "ReturnData": true
    }
  ]' \
  --threshold 20 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

## Best Practices

1. **Enable request metrics for production buckets** - The daily storage metrics alone aren't enough for operational monitoring.
2. **Use filtered metrics** for high-traffic buckets to focus on specific workloads.
3. **Set up anomaly detection** instead of static thresholds where traffic patterns vary.
4. **Combine with CloudTrail** for a complete picture - CloudWatch shows you the "what," CloudTrail shows you the "who."
5. **Use a monitoring platform** like [OneUptime](https://oneuptime.com) to aggregate S3 metrics alongside your application metrics for end-to-end visibility.

For related monitoring setups, check out our guide on [S3 bucket notifications to EventBridge](https://oneuptime.com/blog/post/2026-02-12-s3-bucket-notifications-eventbridge/view) which lets you react to events in real time rather than just tracking metrics.
