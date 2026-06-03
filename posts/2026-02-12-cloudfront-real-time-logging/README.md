# How to Configure CloudFront Real-Time Logging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudFront, Logging, Monitoring, Kinesis

Description: Step-by-step guide to setting up CloudFront real-time logs using Kinesis Data Streams for live traffic analysis, debugging, and monitoring.

---

CloudFront's standard access logs are delivered periodically and usually arrive within an hour, though some log entries can be delayed by up to 24 hours. When you're debugging a production issue or monitoring traffic in real time, that delay is too long. Real-time logging sends request data to Kinesis Data Streams within seconds, giving you near-instant visibility into what's happening at the edge.

## Standard Logs vs Real-Time Logs

**Standard access logs** don't have an additional CloudFront charge, but you still pay for the delivery destination, storage, and access costs. Legacy standard logs go to S3, and standard logging v2 can also deliver to CloudWatch Logs and Firehose. They are best-effort logs for viewer requests. Good for historical analysis and compliance.

**Real-time logs** cost money (CloudFront real-time log charges plus Kinesis charges), arrive within seconds, and let you choose which fields to include and sample requests. Good for live monitoring, alerting, and debugging.

You can use both simultaneously. Many teams use standard logs for archives and real-time logs for operational monitoring.

## Architecture Overview

```mermaid
graph LR
    A[CloudFront Edge] -->|Real-time logs| B[Kinesis Data Stream]
    B --> C[Kinesis Data Firehose]
    C --> D[S3 / OpenSearch / Splunk]
    B --> E[Lambda Consumer]
    E --> F[CloudWatch / Custom Dashboard]
    A -->|Standard logs| G[S3 Bucket]
```

## Step 1: Create a Kinesis Data Stream

Real-time logs require a Kinesis Data Stream as the delivery target:

```bash
# Create a Kinesis data stream for CloudFront logs

aws kinesis create-stream \
  --stream-name cloudfront-realtime-logs \
  --shard-count 2 \
  --region us-east-1
```

The number of shards depends on your traffic volume. Each shard handles 1MB/sec or 1,000 records/sec of write throughput. For a site doing 10,000 requests per second, you'd need roughly 10-15 shards (depending on the fields you log and sampling rate).

Wait for the stream to become active:

```bash
# Wait for the stream to become active
aws kinesis describe-stream \
  --stream-name cloudfront-realtime-logs \
  --query 'StreamDescription.StreamStatus'
```

## Step 2: Create an IAM Role for CloudFront

CloudFront needs permission to write to your Kinesis stream:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "aws:SourceAccount": "123456789012"
        }
      }
    }
  ]
}
```

```bash
# Create the IAM role for CloudFront
aws iam create-role \
  --role-name CloudFrontRealtimeLogRole \
  --assume-role-policy-document file://trust-policy.json
```

Attach a policy granting Kinesis write access:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kinesis:DescribeStreamSummary",
        "kinesis:DescribeStream",
        "kinesis:PutRecord",
        "kinesis:PutRecords"
      ],
      "Resource": "arn:aws:kinesis:us-east-1:123456789012:stream/cloudfront-realtime-logs"
    }
  ]
}
```

```bash
# Create and attach the Kinesis write policy
aws iam put-role-policy \
  --role-name CloudFrontRealtimeLogRole \
  --policy-name KinesisWriteAccess \
  --policy-document file://kinesis-policy.json
```

## Step 3: Create the Real-Time Log Configuration

Now create the logging configuration. You choose which fields to include:

```bash
# Create the real-time log configuration
aws cloudfront create-realtime-log-config \
  --name "production-realtime-logs" \
  --sampling-rate 100 \
  --end-points '[{
    "StreamType": "Kinesis",
    "KinesisStreamConfig": {
      "RoleARN": "arn:aws:iam::123456789012:role/CloudFrontRealtimeLogRole",
      "StreamARN": "arn:aws:kinesis:us-east-1:123456789012:stream/cloudfront-realtime-logs"
    }
  }]' \
  --fields "timestamp" "c-ip" "cs-method" "cs-uri-stem" "sc-status" \
    "sc-bytes" "time-taken" "x-edge-result-type" "x-edge-response-result-type" \
    "cs-protocol" "cs-host" "x-edge-location" "cs-user-agent" \
    "x-forwarded-for" "cs-uri-query" "x-edge-request-id"
```

Each real-time log record can contain up to 40 fields from the available real-time log fields. Here are the most useful ones:

| Field | Description |
|-------|-------------|
| timestamp | Request timestamp |
| c-ip | Client IP |
| cs-method | HTTP method |
| cs-uri-stem | URL path and query string |
| sc-status | HTTP status code |
| sc-bytes | Response bytes |
| time-taken | Total request time in seconds |
| x-edge-result-type | Hit, Miss, Error, etc. |
| x-edge-location | Which edge location served the request |
| cs-user-agent | Client user agent string |

The `sampling-rate` is a percentage (1-100). Set to 100 for all requests, or lower to reduce costs on high-traffic sites. Even 10% sampling gives you statistically meaningful data for most monitoring purposes.

## Step 4: Associate with Your Distribution

Attach the log config to a cache behavior:

```bash
# Get current distribution config
aws cloudfront get-distribution-config --id E1234567890 > config.json
```

Add the real-time log config ARN to the cache behavior:

```json
{
  "DefaultCacheBehavior": {
    "RealtimeLogConfigArn": "arn:aws:cloudfront::123456789012:realtime-log-config/production-realtime-logs",
    "TargetOriginId": "my-origin",
    "ViewerProtocolPolicy": "redirect-to-https"
  }
}
```

```bash
# Update the distribution
aws cloudfront update-distribution \
  --id E1234567890 \
  --distribution-config file://updated-config.json \
  --if-match ETAG_VALUE
```

## Step 5: Process the Logs

### Option A: Kinesis Data Firehose to S3

For storage and batch analysis, pipe the stream to S3 via Firehose:

```bash
# Create a Firehose delivery stream from Kinesis to S3
aws firehose create-delivery-stream \
  --delivery-stream-name cloudfront-logs-to-s3 \
  --delivery-stream-type KinesisStreamAsSource \
  --kinesis-stream-source-configuration '{
    "KinesisStreamARN": "arn:aws:kinesis:us-east-1:123456789012:stream/cloudfront-realtime-logs",
    "RoleARN": "arn:aws:iam::123456789012:role/FirehoseRole"
  }' \
  --s3-destination-configuration '{
    "RoleARN": "arn:aws:iam::123456789012:role/FirehoseRole",
    "BucketARN": "arn:aws:s3:::my-cloudfront-logs",
    "Prefix": "realtime-logs/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
    "ErrorOutputPrefix": "errors/",
    "BufferingHints": {"SizeInMBs": 64, "IntervalInSeconds": 60},
    "CompressionFormat": "GZIP"
  }'
```

### Option B: Lambda Consumer for Real-Time Analysis

Process logs in real time with a Lambda function:

```python
import base64
import boto3

cloudwatch = boto3.client('cloudwatch')

LOG_FIELDS = [
    'timestamp', 'c-ip', 'sc-status', 'sc-bytes', 'cs-method',
    'cs-protocol', 'cs-host', 'cs-uri-stem', 'x-edge-location',
    'x-edge-request-id', 'time-taken', 'cs-user-agent',
    'cs-uri-query', 'x-edge-response-result-type',
    'x-forwarded-for', 'x-edge-result-type'
]

def publish_metrics(error_count, slow_requests):
    """Publish custom CloudWatch metrics."""
    cloudwatch.put_metric_data(
        Namespace='CloudFrontRealtimeLogs',
        MetricData=[
            {'MetricName': '5xxErrors', 'Value': error_count, 'Unit': 'Count'},
            {'MetricName': 'SlowRequests', 'Value': slow_requests, 'Unit': 'Count'}
        ]
    )

def handler(event, context):
    """Process CloudFront real-time logs from Kinesis."""
    error_count = 0
    slow_requests = 0

    for record in event['Records']:
        # Decode the Kinesis record
        payload = base64.b64decode(record['kinesis']['data']).decode('utf-8')
        fields = payload.split('\t')
        record_data = dict(zip(LOG_FIELDS, fields))

        # Parse relevant fields (CloudFront delivers selected fields in its documented field order)
        timestamp = record_data['timestamp']
        client_ip = record_data['c-ip']
        method = record_data['cs-method']
        uri = record_data['cs-uri-stem']
        status = int(record_data['sc-status'])
        bytes_sent = int(record_data['sc-bytes'])
        time_taken = float(record_data['time-taken'])
        result_type = record_data['x-edge-result-type']

        # Count errors
        if status >= 500:
            error_count += 1
            print(f"5xx Error: {status} {method} {uri} from {client_ip}")

        # Track slow requests (over 3 seconds)
        if time_taken > 3.0:
            slow_requests += 1
            print(f"Slow request: {time_taken}s {method} {uri}")

    # Publish custom metrics
    if error_count > 0 or slow_requests > 0:
        publish_metrics(error_count, slow_requests)

    return {'statusCode': 200}
```

Set up the Lambda event source mapping:

```bash
# Connect Lambda to the Kinesis stream
aws lambda create-event-source-mapping \
  --function-name cloudfront-log-processor \
  --event-source-arn arn:aws:kinesis:us-east-1:123456789012:stream/cloudfront-realtime-logs \
  --starting-position LATEST \
  --batch-size 100 \
  --maximum-batching-window-in-seconds 5
```

### Option C: Firehose to OpenSearch

For searchable log analysis, send to OpenSearch via Firehose. OpenSearch delivery requires each record to be a single-line JSON object, so use a Firehose Lambda transform to convert CloudFront's tab-delimited records to JSON first:

```bash
# Create Firehose delivery to OpenSearch
aws firehose create-delivery-stream \
  --delivery-stream-name cloudfront-logs-to-opensearch \
  --delivery-stream-type KinesisStreamAsSource \
  --kinesis-stream-source-configuration '{
    "KinesisStreamARN": "arn:aws:kinesis:us-east-1:123456789012:stream/cloudfront-realtime-logs",
    "RoleARN": "arn:aws:iam::123456789012:role/FirehoseRole"
  }' \
  --amazonopensearchservice-destination-configuration '{
    "RoleARN": "arn:aws:iam::123456789012:role/FirehoseRole",
    "DomainARN": "arn:aws:es:us-east-1:123456789012:domain/my-domain",
    "IndexName": "cloudfront-logs",
    "IndexRotationPeriod": "OneDay",
    "BufferingHints": {"IntervalInSeconds": 60, "SizeInMBs": 1},
    "ProcessingConfiguration": {
      "Enabled": true,
      "Processors": [{
        "Type": "Lambda",
        "Parameters": [{
          "ParameterName": "LambdaArn",
          "ParameterValue": "arn:aws:lambda:us-east-1:123456789012:function:cloudfront-log-transform"
        }]
      }]
    },
    "S3BackupMode": "FailedDocumentsOnly",
    "S3Configuration": {
      "RoleARN": "arn:aws:iam::123456789012:role/FirehoseRole",
      "BucketARN": "arn:aws:s3:::my-cloudfront-logs-backup"
    }
  }'
```

## Monitoring the Pipeline

Make sure your logging pipeline itself is healthy:

```bash
# Check Kinesis stream metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Kinesis \
  --metric-name IncomingRecords \
  --dimensions Name=StreamName,Value=cloudfront-realtime-logs \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Check for write throttling
aws cloudwatch get-metric-statistics \
  --namespace AWS/Kinesis \
  --metric-name WriteProvisionedThroughputExceeded \
  --dimensions Name=StreamName,Value=cloudfront-realtime-logs \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

If you see throttling, increase the shard count.

## Cost Optimization

Real-time logs can get expensive at scale. Ways to manage costs:

- **Reduce sampling rate** - 10-20% is often enough for monitoring
- **Limit fields** - Only include the fields you actually use
- **Use on-demand Kinesis capacity** - Scales automatically without over-provisioning
- **Apply to specific behaviors** - Only log the behaviors you care about, not every request

## Summary

CloudFront real-time logging delivers request data to Kinesis within seconds, enabling live monitoring and rapid debugging. The setup involves creating a Kinesis stream, an IAM role, and a real-time log config that you attach to cache behaviors. Process the logs with Lambda for alerting, Firehose for storage, or OpenSearch for searchable analysis. Start with a low sampling rate and essential fields, then expand as needed. Combine with standard S3 logs for a complete logging strategy.
