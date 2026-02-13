# How to Set Up S3 Access Logging for Audit Trails

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Logging, Audit, Security

Description: Learn how to enable and configure S3 server access logging to create audit trails of all requests made to your S3 buckets for security and compliance.

---

If someone accesses a sensitive file in your S3 bucket, you need to know who did it, when, and from where. S3 server access logging captures detailed records of every request made to a bucket - GET, PUT, DELETE, everything. These logs are essential for security auditing, compliance requirements, and debugging access issues.

## What S3 Access Logs Capture

Each log record includes:

- **Bucket owner and name**
- **Requester** (IAM user, role, or anonymous)
- **Timestamp** (in UTC)
- **Operation** (REST.GET.OBJECT, REST.PUT.OBJECT, etc.)
- **Object key** (which object was accessed)
- **HTTP status code** (200, 403, 404, etc.)
- **Bytes sent and object size**
- **Referrer and user agent**
- **Request URI and query string**
- **TLS version and cipher suite**
- **Access point ARN** (if accessed through an access point)

This is different from CloudTrail, which logs management events (API calls to configure S3) but doesn't capture individual object data operations by default.

## S3 Access Logging vs. CloudTrail Data Events

| Feature | S3 Access Logging | CloudTrail Data Events |
|---------|-------------------|----------------------|
| Cost | Free (just storage costs) | $0.10 per 100,000 events |
| Delivery | Best-effort, minutes to hours | Near real-time |
| Format | Space-delimited log files | Structured JSON |
| Coverage | All requests including anonymous | All authenticated API calls |
| Guaranteed delivery | No (best effort) | Yes |

For compliance and security, many organizations use both: access logging for the complete picture (including anonymous access) and CloudTrail for guaranteed delivery of authenticated events.

## Step 1: Create a Logging Destination Bucket

Store your access logs in a separate bucket. Don't log to the same bucket you're monitoring - that creates an infinite loop of log entries.

```bash
# Create the logging bucket
aws s3api create-bucket \
  --bucket my-s3-access-logs \
  --region us-east-1
```

Set a lifecycle policy to manage log retention.

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-s3-access-logs \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "expire-old-logs",
        "Status": "Enabled",
        "Filter": {"Prefix": ""},
        "Transitions": [
          {"Days": 30, "StorageClass": "STANDARD_IA"},
          {"Days": 90, "StorageClass": "GLACIER"}
        ],
        "Expiration": {"Days": 365}
      }
    ]
  }'
```

## Step 2: Grant Logging Permissions

The S3 logging service needs permission to write to your logging bucket. This is done through the bucket's ACL or a bucket policy.

Using a bucket policy (recommended approach):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ServerAccessLogsPolicy",
      "Effect": "Allow",
      "Principal": {
        "Service": "logging.s3.amazonaws.com"
      },
      "Action": [
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-s3-access-logs/*",
      "Condition": {
        "ArnLike": {
          "aws:SourceArn": "arn:aws:s3:::my-source-bucket"
        },
        "StringEquals": {
          "aws:SourceAccount": "123456789012"
        }
      }
    }
  ]
}
```

```bash
aws s3api put-bucket-policy \
  --bucket my-s3-access-logs \
  --policy file://logging-bucket-policy.json
```

## Step 3: Enable Access Logging

Configure the source bucket to send logs to the destination.

```bash
# Enable access logging
aws s3api put-bucket-logging \
  --bucket my-source-bucket \
  --bucket-logging-status '{
    "LoggingEnabled": {
      "TargetBucket": "my-s3-access-logs",
      "TargetPrefix": "logs/my-source-bucket/"
    }
  }'
```

The `TargetPrefix` organizes logs by source bucket. If you're logging multiple buckets to the same destination, use different prefixes for each.

## Step 4: Verify Logging Is Enabled

Check the current logging configuration.

```bash
# Verify logging is enabled
aws s3api get-bucket-logging --bucket my-source-bucket
```

After enabling, it can take a few hours for the first logs to appear.

## Understanding the Log Format

Here's what a single log record looks like (wrapped for readability):

```
79a59df900b949e55d96a1e698fbacedfd6e09d98eacf8f8d5218e7cd47ef2be
my-source-bucket [12/Feb/2026:10:30:45 +0000] 192.168.1.100
arn:aws:iam::123456789012:user/admin 3E57427F3EXAMPLE
REST.GET.OBJECT documents/report.pdf "GET /documents/report.pdf HTTP/1.1"
200 - 4567890 4567890 50 30
"https://console.aws.amazon.com/s3/buckets/my-source-bucket"
"Mozilla/5.0" - BvKMZhMGQ= SigV4 ECDHE-RSA-AES128-GCM-SHA256 AuthHeader
s3.us-east-1.amazonaws.com TLSv1.2
```

The fields are space-delimited. Here's a quick reference for the most useful ones:

| Position | Field | Example |
|----------|-------|---------|
| 3 | Timestamp | [12/Feb/2026:10:30:45 +0000] |
| 4 | Remote IP | 192.168.1.100 |
| 5 | Requester | arn:aws:iam::123456789012:user/admin |
| 7 | Operation | REST.GET.OBJECT |
| 8 | Key | documents/report.pdf |
| 10 | HTTP Status | 200 |
| 12 | Bytes Sent | 4567890 |

## Step 5: Parse Logs with Python

Here's a script that parses access logs and extracts useful information.

```python
import boto3
import gzip
import re
from collections import defaultdict
from datetime import datetime

s3 = boto3.client('s3')

LOG_BUCKET = 'my-s3-access-logs'
LOG_PREFIX = 'logs/my-source-bucket/'

# Regex pattern for S3 access log lines
LOG_PATTERN = re.compile(
    r'(\S+) (\S+) \[([^\]]+)\] (\S+) (\S+) (\S+) (\S+) (\S+) '
    r'"([^"]*)" (\d{3}) (\S+) (\S+) (\S+) (\S+) (\S+) '
    r'"([^"]*)" "([^"]*)"'
)

def parse_access_logs(date_prefix=''):
    """Parse S3 access logs and generate a summary."""
    paginator = s3.get_paginator('list_objects_v2')
    prefix = f"{LOG_PREFIX}{date_prefix}"

    access_counts = defaultdict(int)
    status_codes = defaultdict(int)
    top_requesters = defaultdict(int)
    failed_access = []

    pages = paginator.paginate(Bucket=LOG_BUCKET, Prefix=prefix)

    for page in pages:
        for obj in page.get('Contents', []):
            response = s3.get_object(Bucket=LOG_BUCKET, Key=obj['Key'])
            log_data = response['Body'].read().decode('utf-8')

            for line in log_data.strip().split('\n'):
                match = LOG_PATTERN.match(line)
                if not match:
                    continue

                operation = match.group(7)
                key = match.group(8)
                status = match.group(10)
                requester = match.group(5)

                access_counts[operation] += 1
                status_codes[status] += 1
                top_requesters[requester] += 1

                # Track failed access attempts
                if status in ('403', '401'):
                    failed_access.append({
                        'key': key,
                        'requester': requester,
                        'status': status,
                        'timestamp': match.group(3)
                    })

    # Print summary
    print("=== Access Log Summary ===\n")

    print("Operations:")
    for op, count in sorted(access_counts.items(), key=lambda x: -x[1]):
        print(f"  {op}: {count}")

    print("\nStatus Codes:")
    for code, count in sorted(status_codes.items()):
        print(f"  {code}: {count}")

    print(f"\nFailed Access Attempts: {len(failed_access)}")
    for attempt in failed_access[:10]:
        print(f"  {attempt['timestamp']} - {attempt['requester']} "
              f"tried to access {attempt['key']} (HTTP {attempt['status']})")

parse_access_logs()
```

## Step 6: Enable Logging for Multiple Buckets

Automate logging setup across all your buckets.

```python
import boto3

s3 = boto3.client('s3')

LOG_BUCKET = 'my-s3-access-logs'

# Get all buckets
response = s3.list_buckets()

for bucket in response['Buckets']:
    bucket_name = bucket['Name']

    # Skip the log bucket itself
    if bucket_name == LOG_BUCKET:
        continue

    # Check if logging is already enabled
    try:
        logging_config = s3.get_bucket_logging(Bucket=bucket_name)
        if logging_config.get('LoggingEnabled'):
            print(f"Already enabled: {bucket_name}")
            continue
    except Exception:
        pass

    # Enable logging
    try:
        s3.put_bucket_logging(
            Bucket=bucket_name,
            BucketLoggingStatus={
                'LoggingEnabled': {
                    'TargetBucket': LOG_BUCKET,
                    'TargetPrefix': f'logs/{bucket_name}/'
                }
            }
        )
        print(f"Enabled logging: {bucket_name}")
    except Exception as e:
        print(f"Failed for {bucket_name}: {e}")
```

## Querying Logs at Scale

For large volumes of logs, parsing with Python scripts doesn't scale. Use Amazon Athena instead. See our detailed guide on [analyzing S3 access logs with Athena](https://oneuptime.com/blog/post/2026-02-12-analyze-s3-access-logs-athena/view).

## Alerting on Suspicious Activity

Set up automated alerts for unusual access patterns by processing logs with Lambda.

```python
import boto3
import re

sns = boto3.client('sns')
ALERT_TOPIC = 'arn:aws:sns:us-east-1:123456789012:security-alerts'

# Patterns to watch for
SUSPICIOUS_PATTERNS = [
    'REST.DELETE.OBJECT',   # Object deletions
    'REST.PUT.BUCKETPOLICY', # Bucket policy changes
    'REST.PUT.BUCKETACL',    # ACL changes
]

def lambda_handler(event, context):
    """Process new access logs and alert on suspicious activity."""
    s3 = boto3.client('s3')

    alerts = []

    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = record['s3']['object']['key']

        response = s3.get_object(Bucket=bucket, Key=key)
        log_data = response['Body'].read().decode('utf-8')

        for line in log_data.strip().split('\n'):
            for pattern in SUSPICIOUS_PATTERNS:
                if pattern in line:
                    alerts.append(line)

    if alerts:
        message = f"Suspicious S3 activity detected ({len(alerts)} events):\n\n"
        message += "\n".join(alerts[:20])

        sns.publish(
            TopicArn=ALERT_TOPIC,
            Subject='S3 Security Alert: Suspicious Activity',
            Message=message
        )

    return {'alerts_found': len(alerts)}
```

## Wrapping Up

S3 access logging is one of the first things you should enable on any bucket that holds sensitive or important data. It's free (you only pay for log storage), provides detailed records of every request, and gives you the raw data needed for security audits and compliance. Combine it with Athena for querying at scale and Lambda for real-time alerting, and you've got a complete audit trail for your S3 infrastructure.
