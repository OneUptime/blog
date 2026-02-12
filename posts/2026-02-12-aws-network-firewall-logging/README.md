# How to Set Up AWS Network Firewall Logging

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Network Firewall, Logging, VPC, Security

Description: Configure logging for AWS Network Firewall to capture flow logs, alert logs, and TLS inspection logs for network traffic analysis and troubleshooting.

---

AWS Network Firewall gives you deep packet inspection, intrusion prevention, and domain filtering for your VPC traffic. But running a firewall without logging is like having a security camera with no recording. You need to see what's being allowed, what's being blocked, and what's triggering your rules. Without logs, troubleshooting connectivity issues becomes guesswork and security investigations hit dead ends.

Network Firewall supports three log types: flow logs, alert logs, and TLS inspection logs. Each serves a different purpose, and you can send them to different destinations. Let's configure all three.

## Log Types Explained

**Flow logs** record metadata about every connection that passes through the firewall - source/destination IPs, ports, protocol, bytes transferred, and the action taken (allow/drop). Think of these as your traffic ledger.

**Alert logs** are generated when traffic matches a Suricata-compatible IDS/IPS rule. These contain the rule that fired, the signature ID, the severity, and details about the matching traffic. These are your security events.

**TLS inspection logs** are generated when you're using TLS inspection. They record details about TLS connections including the server name indication (SNI), certificate details, and the inspection result.

## Logging Destinations

You can send each log type to one or more of these destinations:
- Amazon S3 (for long-term storage and Athena queries)
- CloudWatch Logs (for real-time monitoring and alarms)
- Kinesis Data Firehose (for streaming to third-party tools)

Most teams use a combination. CloudWatch for real-time alerts, S3 for long-term analysis.

## Setting Up S3 Logging

### Create the S3 Bucket

First, create a bucket for your firewall logs with appropriate encryption and lifecycle policies.

```bash
# Create the logging bucket
aws s3api create-bucket \
  --bucket network-firewall-logs-111111111111 \
  --region us-east-1

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket network-firewall-logs-111111111111 \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "alias/firewall-logs"
      }
    }]
  }'
```

### Configure Firewall Logging to S3

This configures the Network Firewall to send both flow and alert logs to S3:

```bash
aws network-firewall update-logging-configuration \
  --firewall-arn arn:aws:network-firewall:us-east-1:111111111111:firewall/my-firewall \
  --logging-configuration '{
    "LogDestinationConfigs": [
      {
        "LogType": "FLOW",
        "LogDestinationType": "S3",
        "LogDestination": {
          "bucketName": "network-firewall-logs-111111111111",
          "prefix": "flow-logs/"
        }
      },
      {
        "LogType": "ALERT",
        "LogDestinationType": "S3",
        "LogDestination": {
          "bucketName": "network-firewall-logs-111111111111",
          "prefix": "alert-logs/"
        }
      }
    ]
  }'
```

## Setting Up CloudWatch Logging

CloudWatch Logs gives you the ability to set up metric filters and alarms for real-time alerting.

First, create the log groups:

```bash
# Create log groups
aws logs create-log-group --log-group-name /aws/network-firewall/flow
aws logs create-log-group --log-group-name /aws/network-firewall/alert

# Set retention (don't let them grow forever)
aws logs put-retention-policy \
  --log-group-name /aws/network-firewall/flow \
  --retention-in-days 30

aws logs put-retention-policy \
  --log-group-name /aws/network-firewall/alert \
  --retention-in-days 90
```

Configure the firewall to send logs to CloudWatch:

```bash
aws network-firewall update-logging-configuration \
  --firewall-arn arn:aws:network-firewall:us-east-1:111111111111:firewall/my-firewall \
  --logging-configuration '{
    "LogDestinationConfigs": [
      {
        "LogType": "FLOW",
        "LogDestinationType": "CloudWatchLogs",
        "LogDestination": {
          "logGroup": "/aws/network-firewall/flow"
        }
      },
      {
        "LogType": "ALERT",
        "LogDestinationType": "CloudWatchLogs",
        "LogDestination": {
          "logGroup": "/aws/network-firewall/alert"
        }
      }
    ]
  }'
```

## Setting Up Kinesis Firehose Logging

If you're streaming to a SIEM or third-party analytics platform, Kinesis Firehose is your best option.

Create a Firehose delivery stream first, then configure the firewall:

```bash
aws network-firewall update-logging-configuration \
  --firewall-arn arn:aws:network-firewall:us-east-1:111111111111:firewall/my-firewall \
  --logging-configuration '{
    "LogDestinationConfigs": [
      {
        "LogType": "ALERT",
        "LogDestinationType": "KinesisDataFirehose",
        "LogDestination": {
          "deliveryStream": "network-firewall-alerts-stream"
        }
      }
    ]
  }'
```

## Combining Multiple Destinations

You can send each log type to multiple destinations simultaneously. Here's a complete configuration that sends flow logs to S3 and CloudWatch, and alert logs to all three destinations:

```bash
aws network-firewall update-logging-configuration \
  --firewall-arn arn:aws:network-firewall:us-east-1:111111111111:firewall/my-firewall \
  --logging-configuration '{
    "LogDestinationConfigs": [
      {
        "LogType": "FLOW",
        "LogDestinationType": "S3",
        "LogDestination": {
          "bucketName": "network-firewall-logs-111111111111",
          "prefix": "flow/"
        }
      },
      {
        "LogType": "FLOW",
        "LogDestinationType": "CloudWatchLogs",
        "LogDestination": {
          "logGroup": "/aws/network-firewall/flow"
        }
      },
      {
        "LogType": "ALERT",
        "LogDestinationType": "S3",
        "LogDestination": {
          "bucketName": "network-firewall-logs-111111111111",
          "prefix": "alert/"
        }
      },
      {
        "LogType": "ALERT",
        "LogDestinationType": "CloudWatchLogs",
        "LogDestination": {
          "logGroup": "/aws/network-firewall/alert"
        }
      },
      {
        "LogType": "ALERT",
        "LogDestinationType": "KinesisDataFirehose",
        "LogDestination": {
          "deliveryStream": "firewall-alerts-stream"
        }
      }
    ]
  }'
```

## Terraform Configuration

Here's the complete Terraform setup for Network Firewall logging:

```hcl
resource "aws_networkfirewall_logging_configuration" "main" {
  firewall_arn = aws_networkfirewall_firewall.main.arn

  logging_configuration {
    log_destination_config {
      log_destination = {
        bucketName = aws_s3_bucket.firewall_logs.id
        prefix     = "flow/"
      }
      log_destination_type = "S3"
      log_type             = "FLOW"
    }

    log_destination_config {
      log_destination = {
        logGroup = aws_cloudwatch_log_group.firewall_alerts.name
      }
      log_destination_type = "CloudWatchLogs"
      log_type             = "ALERT"
    }

    log_destination_config {
      log_destination = {
        bucketName = aws_s3_bucket.firewall_logs.id
        prefix     = "alert/"
      }
      log_destination_type = "S3"
      log_type             = "ALERT"
    }
  }
}

resource "aws_cloudwatch_log_group" "firewall_alerts" {
  name              = "/aws/network-firewall/alert"
  retention_in_days = 90
}

resource "aws_s3_bucket" "firewall_logs" {
  bucket = "network-firewall-logs-${data.aws_caller_identity.current.account_id}"
}
```

## Querying Logs with Athena

For deep analysis, query your S3-stored logs with Athena.

This creates an Athena table for Network Firewall alert logs:

```sql
CREATE EXTERNAL TABLE nfw_alert_logs (
    firewall_name STRING,
    availability_zone STRING,
    event STRUCT<
        timestamp: STRING,
        flow_id: BIGINT,
        event_type: STRING,
        src_ip: STRING,
        src_port: INT,
        dest_ip: STRING,
        dest_port: INT,
        proto: STRING,
        alert: STRUCT<
            action: STRING,
            signature_id: INT,
            rev: INT,
            signature: STRING,
            category: STRING,
            severity: INT
        >
    >
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://network-firewall-logs-111111111111/alert/'
```

Run analytics queries:

```sql
-- Top 10 triggered alert rules
SELECT
    event.alert.signature,
    event.alert.category,
    event.alert.severity,
    COUNT(*) as trigger_count
FROM nfw_alert_logs
WHERE event.event_type = 'alert'
GROUP BY event.alert.signature, event.alert.category, event.alert.severity
ORDER BY trigger_count DESC
LIMIT 10;

-- Blocked connections by destination
SELECT
    event.dest_ip,
    event.dest_port,
    COUNT(*) as block_count
FROM nfw_alert_logs
WHERE event.alert.action = 'blocked'
GROUP BY event.dest_ip, event.dest_port
ORDER BY block_count DESC
LIMIT 20;
```

## Setting Up CloudWatch Alarms

Create alarms for important firewall events.

This metric filter catches high-severity alerts and creates a CloudWatch alarm:

```bash
# Create metric filter for high severity alerts
aws logs put-metric-filter \
  --log-group-name /aws/network-firewall/alert \
  --filter-name HighSeverityAlerts \
  --filter-pattern '{ $.event.alert.severity <= 2 }' \
  --metric-transformations \
    metricName=HighSeverityAlerts,metricNamespace=NetworkFirewall,metricValue=1

# Create alarm
aws cloudwatch put-metric-alarm \
  --alarm-name NetworkFirewallHighSeverity \
  --metric-name HighSeverityAlerts \
  --namespace NetworkFirewall \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:111111111111:security-alerts
```

## Best Practices

**Always enable both flow and alert logs.** Flow logs show you the full traffic picture. Alert logs show you the security events. You need both for complete visibility.

**Use S3 for retention, CloudWatch for alerting.** S3 is cheap for long-term storage. CloudWatch is better for real-time monitoring and metric-based alarms.

**Set appropriate retention periods.** Flow logs generate a lot of data. Keep them for 30-90 days unless compliance requires more. Alert logs should be kept longer since they're security-relevant.

**Monitor log delivery.** Make sure logs are actually flowing. A gap in logging during an incident is a nightmare scenario. Set up [OneUptime](https://oneuptime.com) monitoring on your log delivery pipeline to catch any interruptions.

For related VPC security topics, check out our guide on [VPC Flow Logs with custom fields](https://oneuptime.com/blog/post/vpc-flow-logs-custom-fields/view) to get another angle on your network traffic analysis.
