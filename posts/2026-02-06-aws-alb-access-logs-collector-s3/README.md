# How to Ingest AWS App Load Balancer Access Logs into the OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, AWS ALB, S3, Access Logs

Description: Ingest AWS Application Load Balancer access logs from S3 into the OpenTelemetry Collector for centralized observability and analysis.

AWS Application Load Balancers (ALB) write detailed access logs to S3. These logs contain request timing, target response codes, TLS details, and more. By ingesting them into the OpenTelemetry Collector, you can analyze ALB traffic alongside your application telemetry. This post covers the full pipeline from S3 to your observability backend.

## Enabling ALB Access Logs

First, enable access logging on your ALB:

```bash
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/abc123 \
  --attributes Key=access_logs.s3.enabled,Value=true \
               Key=access_logs.s3.bucket,Value=my-alb-logs \
               Key=access_logs.s3.prefix,Value=alb-logs
```

ALB writes logs in gzip-compressed format to a path like:

```text
s3://my-alb-logs/alb-logs/AWSLogs/123456789012/elasticloadbalancing/us-east-1/2026/02/06/
```

## ALB Log Format

Each log line contains space-delimited fields:

```text
http 2026-02-06T10:30:00.123456Z app/my-alb/abc123 10.0.0.5:54321 10.0.1.10:8080 0.001 0.045 0.000 200 200 234 5678 "GET https://example.com:443/api/users HTTP/1.1" "Mozilla/5.0" ECDHE-RSA-AES128-GCM-SHA256 TLSv1.2 arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/my-tg/def456 "Root=1-abc-def" "example.com" "arn:aws:acm:..." 0 2026-02-06T10:30:00.123000Z "forward" "-" "-" "10.0.1.10:8080" "200" "-" "-"
```

## Processing Pipeline Architecture

The recommended architecture uses an S3 notification to trigger processing:

```text
ALB -> S3 -> SQS -> Collector (S3 receiver) -> Backend
```

Or you can fetch a time range from S3 directly with the Collector.

## Collector Configuration with S3 Receiver

The Collector contrib distribution includes an AWS S3 receiver:

```yaml
# otel-collector-config.yaml

extensions:
  text_encoding:
    encoding: utf8
    unmarshaling_separator: "\r?\n"

receivers:
  awss3:
    # SQS queue that receives S3 notifications
    sqs:
      queue_url: https://sqs.us-east-1.amazonaws.com/123456789012/alb-log-notifications
      region: us-east-1
      max_number_of_messages: 10
    # S3 configuration
    s3downloader:
      region: us-east-1
      s3_bucket: my-alb-logs
      s3_prefix: alb-logs
    # Read ALB .log.gz files as text log records
    encodings:
      - extension: text_encoding
        suffix: ".log"

processors:
  batch:
    timeout: 10s
    send_batch_size: 500

  # Add resource attributes to the log records
  transform:
    log_statements:
      - context: log
        statements:
          - set(resource.attributes["service.name"], "aws-alb")
          - set(resource.attributes["cloud.provider"], "aws")

exporters:
  otlp:
    endpoint: "your-backend:4317"
    tls:
      insecure: false

service:
  extensions: [text_encoding]
  pipelines:
    logs:
      receivers: [awss3]
      processors: [transform, batch]
      exporters: [otlp]
```

## Using a Lambda-Based Pipeline

A more common pattern uses a Lambda function to process S3 events and forward to the Collector:

```python
# lambda_function.py
import boto3
import datetime
import gzip
import json
import shlex
import urllib.request

s3_client = boto3.client('s3')
COLLECTOR_ENDPOINT = "http://collector.internal:4318/v1/logs"

def parse_host_port(value):
    if value == "-" or ":" not in value:
        return value, ""
    host, port = value.rsplit(":", 1)
    return host.strip("[]"), port

def parse_float(value):
    return None if value == "-" else float(value)

def parse_int(value):
    return None if value == "-" else int(value)

def timestamp_to_unix_nano(timestamp):
    dt = datetime.datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
    return str(int(dt.timestamp() * 1_000_000_000))

def parse_alb_log_line(line):
    """Parse an ALB access log line into structured fields."""
    fields = shlex.split(line)
    if len(fields) < 25:
        return None

    client_ip, client_port = parse_host_port(fields[3])
    target_ip, target_port = parse_host_port(fields[4])

    return {
        "type": fields[0],
        "timestamp": fields[1],
        "elb": fields[2],
        "client_ip": client_ip,
        "client_port": client_port,
        "target_ip": target_ip,
        "target_port": target_port,
        "request_processing_time": parse_float(fields[5]),
        "target_processing_time": parse_float(fields[6]),
        "response_processing_time": parse_float(fields[7]),
        "elb_status_code": parse_int(fields[8]),
        "target_status_code": parse_int(fields[9]),
        "received_bytes": parse_int(fields[10]),
        "sent_bytes": parse_int(fields[11]),
        "request": fields[12],
    }

def handler(event, context):
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        # Download and decompress the log file
        response = s3_client.get_object(Bucket=bucket, Key=key)
        content = gzip.decompress(response['Body'].read()).decode('utf-8')

        # Parse each log line
        logs = []
        for line in content.strip().split('\n'):
            parsed = parse_alb_log_line(line)
            if parsed:
                logs.append(parsed)

        # Send to Collector via OTLP HTTP
        payload = {
            "resourceLogs": [{
                "resource": {
                    "attributes": [
                        {"key": "service.name", "value": {"stringValue": "aws-alb"}},
                        {"key": "cloud.provider", "value": {"stringValue": "aws"}}
                    ]
                },
                "scopeLogs": [{
                    "logRecords": [
                        {
                            "timeUnixNano": timestamp_to_unix_nano(log["timestamp"]),
                            "body": {"stringValue": json.dumps(log)},
                            "attributes": [
                                {"key": "http.response.status_code", "value": {"intValue": log["elb_status_code"]}},
                                {"key": "http.request.method", "value": {"stringValue": log["request"].split()[0]}},
                            ]
                        }
                        for log in logs
                    ]
                }]
            }]
        }

        req = urllib.request.Request(
            COLLECTOR_ENDPOINT,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        urllib.request.urlopen(req)

    return {"statusCode": 200}
```

## Setting Up S3 Notifications

Configure S3 to notify SQS when new log files arrive:

```bash
# Create SQS queue
aws sqs create-queue --queue-name alb-log-notifications

# Allow S3 to send messages to the queue
aws sqs set-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/alb-log-notifications \
  --attributes '{
    "Policy": "{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"s3.amazonaws.com\"},\"Action\":\"sqs:SendMessage\",\"Resource\":\"arn:aws:sqs:us-east-1:123456789012:alb-log-notifications\",\"Condition\":{\"ArnEquals\":{\"aws:SourceArn\":\"arn:aws:s3:::my-alb-logs\"}}}]}"
  }'

# Configure S3 notification
aws s3api put-bucket-notification-configuration \
  --bucket my-alb-logs \
  --notification-configuration '{
    "QueueConfigurations": [{
      "QueueArn": "arn:aws:sqs:us-east-1:123456789012:alb-log-notifications",
      "Events": ["s3:ObjectCreated:*"],
      "Filter": {
        "Key": {
          "FilterRules": [{"Name": "prefix", "Value": "alb-logs/"}]
        }
      }
    }]
  }'
```

## Useful ALB Log Queries

Once ingested, query ALB logs for common patterns:

- **Slow requests**: Filter by `target_processing_time > 5s`
- **5xx errors**: Filter by `elb_status_code >= 500`
- **Target errors**: Filter by `target_status_code >= 500`
- **Client distribution**: Group by `client_ip`
- **Request volume**: Count by time bucket

## Summary

AWS ALB access logs in S3 contain valuable data about load balancer behavior, request timing, and error rates. Ingest them into the OpenTelemetry Collector using either the S3 receiver directly or a Lambda function triggered by S3 notifications. Parse the space-delimited log format into structured attributes and export via OTLP. This gives you ALB observability alongside your application telemetry in a single backend.
