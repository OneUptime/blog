# How to Set Up S3 Replication Time Control (RTC) for Compliance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Replication, Compliance

Description: Configure S3 Replication Time Control to guarantee that 99.99 percent of objects replicate within 15 minutes, meeting compliance requirements for data residency and disaster recovery.

---

Standard S3 cross-region replication doesn't give you any time guarantees. Most objects replicate within minutes, but some can take hours - especially large objects or during high-traffic periods. For compliance scenarios where you need provable replication SLAs, that's not good enough.

S3 Replication Time Control (RTC) guarantees that 99.99% of new objects replicate within 15 minutes. It also comes with CloudWatch metrics so you can prove compliance to auditors. Let's set it up.

## What RTC Gives You

Regular replication replicates objects on a "best effort" basis. RTC adds:

- **15-minute SLA**: 99.99% of objects replicate within 15 minutes
- **Replication metrics**: Real-time CloudWatch metrics showing pending bytes and operations
- **S3 event notifications**: Notifications when replication completes or fails
- **Backed by SLA**: AWS provides service credits if they miss the 15-minute target

This matters for:
- Financial services with data residency requirements
- Healthcare organizations needing replicated backups
- Any regulation that requires provable RPO (Recovery Point Objective)

## Prerequisites

Before configuring RTC, both source and destination buckets need versioning enabled.

```bash
# Enable versioning on source bucket
aws s3api put-bucket-versioning \
  --bucket source-bucket-us-east-1 \
  --versioning-configuration Status=Enabled

# Enable versioning on destination bucket
aws s3api put-bucket-versioning \
  --bucket destination-bucket-eu-west-1 \
  --versioning-configuration Status=Enabled
```

## Create the IAM Role

S3 needs a role to replicate objects to the destination.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "s3.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Permissions policy for the role.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetReplicationConfiguration",
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::source-bucket-us-east-1"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObjectVersionForReplication",
        "s3:GetObjectVersionAcl",
        "s3:GetObjectVersionTagging"
      ],
      "Resource": "arn:aws:s3:::source-bucket-us-east-1/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ReplicateObject",
        "s3:ReplicateDelete",
        "s3:ReplicateTags"
      ],
      "Resource": "arn:aws:s3:::destination-bucket-eu-west-1/*"
    }
  ]
}
```

Create the role.

```bash
# Create the replication role
aws iam create-role \
  --role-name S3ReplicationRTCRole \
  --assume-role-policy-document file://trust-policy.json

aws iam put-role-policy \
  --role-name S3ReplicationRTCRole \
  --policy-name ReplicationPolicy \
  --policy-document file://permissions-policy.json
```

## Configure Replication with RTC

Now set up the replication rule with RTC and metrics enabled.

```bash
# Configure replication with RTC
aws s3api put-bucket-replication \
  --bucket source-bucket-us-east-1 \
  --replication-configuration '{
    "Role": "arn:aws:iam::123456789012:role/S3ReplicationRTCRole",
    "Rules": [
      {
        "ID": "RTC-Compliance-Rule",
        "Status": "Enabled",
        "Priority": 1,
        "Filter": {},
        "Destination": {
          "Bucket": "arn:aws:s3:::destination-bucket-eu-west-1",
          "StorageClass": "STANDARD",
          "ReplicationTime": {
            "Status": "Enabled",
            "Time": {
              "Minutes": 15
            }
          },
          "Metrics": {
            "Status": "Enabled",
            "EventThreshold": {
              "Minutes": 15
            }
          }
        },
        "DeleteMarkerReplication": {
          "Status": "Enabled"
        }
      }
    ]
  }'
```

The key additions compared to standard replication are:

- `ReplicationTime.Status: Enabled` turns on RTC
- `ReplicationTime.Time.Minutes: 15` sets the SLA target
- `Metrics.Status: Enabled` turns on CloudWatch metrics
- `Metrics.EventThreshold.Minutes: 15` sets the threshold for event notifications

## Adding KMS Encryption Support

If your objects use SSE-KMS encryption, add encryption configuration to the replication rule.

```bash
# Replication with KMS encryption support
aws s3api put-bucket-replication \
  --bucket source-bucket-us-east-1 \
  --replication-configuration '{
    "Role": "arn:aws:iam::123456789012:role/S3ReplicationRTCRole",
    "Rules": [
      {
        "ID": "RTC-KMS-Rule",
        "Status": "Enabled",
        "Priority": 1,
        "Filter": {},
        "Destination": {
          "Bucket": "arn:aws:s3:::destination-bucket-eu-west-1",
          "EncryptionConfiguration": {
            "ReplicaKmsKeyID": "arn:aws:kms:eu-west-1:123456789012:key/dest-key-id"
          },
          "ReplicationTime": {
            "Status": "Enabled",
            "Time": { "Minutes": 15 }
          },
          "Metrics": {
            "Status": "Enabled",
            "EventThreshold": { "Minutes": 15 }
          }
        },
        "SourceSelectionCriteria": {
          "SseKmsEncryptedObjects": {
            "Status": "Enabled"
          }
        },
        "DeleteMarkerReplication": {
          "Status": "Enabled"
        }
      }
    ]
  }'
```

The IAM role also needs KMS permissions.

```json
{
  "Effect": "Allow",
  "Action": ["kms:Decrypt"],
  "Resource": "arn:aws:kms:us-east-1:123456789012:key/source-key-id"
},
{
  "Effect": "Allow",
  "Action": ["kms:Encrypt"],
  "Resource": "arn:aws:kms:eu-west-1:123456789012:key/dest-key-id"
}
```

## Monitoring Replication with CloudWatch

RTC provides three CloudWatch metrics you should monitor closely.

```bash
# Check bytes pending replication
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name BytesPendingReplication \
  --dimensions Name=SourceBucket,Value=source-bucket-us-east-1 \
               Name=DestinationBucket,Value=destination-bucket-eu-west-1 \
               Name=RuleId,Value=RTC-Compliance-Rule \
  --start-time 2026-02-12T00:00:00Z \
  --end-time 2026-02-12T23:59:59Z \
  --period 300 \
  --statistics Maximum

# Check operations pending replication
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name OperationsPendingReplication \
  --dimensions Name=SourceBucket,Value=source-bucket-us-east-1 \
               Name=DestinationBucket,Value=destination-bucket-eu-west-1 \
               Name=RuleId,Value=RTC-Compliance-Rule \
  --start-time 2026-02-12T00:00:00Z \
  --end-time 2026-02-12T23:59:59Z \
  --period 300 \
  --statistics Maximum

# Check replication latency
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name ReplicationLatency \
  --dimensions Name=SourceBucket,Value=source-bucket-us-east-1 \
               Name=DestinationBucket,Value=destination-bucket-eu-west-1 \
               Name=RuleId,Value=RTC-Compliance-Rule \
  --start-time 2026-02-12T00:00:00Z \
  --end-time 2026-02-12T23:59:59Z \
  --period 300 \
  --statistics Maximum
```

## Setting Up Alarms

Create CloudWatch alarms to alert when replication falls behind.

```bash
# Alarm when replication latency exceeds 10 minutes
aws cloudwatch put-metric-alarm \
  --alarm-name rtc-replication-latency \
  --alarm-description "S3 RTC replication latency approaching SLA" \
  --metric-name ReplicationLatency \
  --namespace AWS/S3 \
  --statistic Maximum \
  --period 300 \
  --threshold 600 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --dimensions \
    Name=SourceBucket,Value=source-bucket-us-east-1 \
    Name=DestinationBucket,Value=destination-bucket-eu-west-1 \
    Name=RuleId,Value=RTC-Compliance-Rule \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts

# Alarm when pending bytes exceed threshold
aws cloudwatch put-metric-alarm \
  --alarm-name rtc-pending-bytes \
  --alarm-description "Large replication backlog detected" \
  --metric-name BytesPendingReplication \
  --namespace AWS/S3 \
  --statistic Maximum \
  --period 300 \
  --threshold 1073741824 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --dimensions \
    Name=SourceBucket,Value=source-bucket-us-east-1 \
    Name=DestinationBucket,Value=destination-bucket-eu-west-1 \
    Name=RuleId,Value=RTC-Compliance-Rule \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

## Compliance Reporting

For auditors, you can generate replication compliance reports from CloudWatch metrics showing that 99.99% of objects replicated within 15 minutes.

Build a dashboard that tracks the metrics over time.

```bash
# Create a compliance dashboard
aws cloudwatch put-dashboard \
  --dashboard-name S3-RTC-Compliance \
  --dashboard-body '{
    "widgets": [
      {
        "type": "metric",
        "width": 24,
        "height": 6,
        "properties": {
          "metrics": [
            ["AWS/S3", "ReplicationLatency", "SourceBucket", "source-bucket-us-east-1", "DestinationBucket", "destination-bucket-eu-west-1", "RuleId", "RTC-Compliance-Rule", {"stat": "Maximum"}],
            ["...", {"stat": "Average"}]
          ],
          "title": "Replication Latency (seconds)",
          "period": 300,
          "annotations": {
            "horizontal": [{"value": 900, "label": "15 min SLA", "color": "#d62728"}]
          }
        }
      },
      {
        "type": "metric",
        "width": 12,
        "height": 6,
        "properties": {
          "metrics": [
            ["AWS/S3", "BytesPendingReplication", "SourceBucket", "source-bucket-us-east-1", "DestinationBucket", "destination-bucket-eu-west-1", "RuleId", "RTC-Compliance-Rule"]
          ],
          "title": "Bytes Pending Replication",
          "period": 300
        }
      },
      {
        "type": "metric",
        "width": 12,
        "height": 6,
        "properties": {
          "metrics": [
            ["AWS/S3", "OperationsPendingReplication", "SourceBucket", "source-bucket-us-east-1", "DestinationBucket", "destination-bucket-eu-west-1", "RuleId", "RTC-Compliance-Rule"]
          ],
          "title": "Operations Pending Replication",
          "period": 300
        }
      }
    ]
  }'
```

## Cost

RTC adds a premium on top of standard replication costs:

- Standard replication: Data transfer costs only
- RTC: Additional charge per GB replicated (check current pricing)

The RTC charge is on top of the normal cross-region data transfer fee. For compliance scenarios, the cost is usually justified by the guaranteed SLA.

For existing objects that were uploaded before RTC was enabled, see our guide on [S3 Batch Replication](https://oneuptime.com/blog/post/2026-02-12-s3-batch-replication-existing-objects/view).

For comprehensive replication monitoring beyond CloudWatch, use [OneUptime](https://oneuptime.com) to build custom dashboards that combine replication metrics with application-level health checks.
