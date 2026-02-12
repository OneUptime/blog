# How to Set Up GuardDuty S3 Protection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, GuardDuty, S3, Security, Data Protection

Description: Enable GuardDuty S3 Protection to detect suspicious access patterns, data exfiltration attempts, and anomalous API calls targeting your S3 buckets.

---

S3 buckets are one of the most common targets in AWS. Whether it's accidental public exposure, insider threats, or sophisticated data exfiltration, your object storage is a high-value target. GuardDuty S3 Protection adds a dedicated threat detection layer specifically for S3, analyzing CloudTrail S3 data events to spot suspicious activity that would be invisible from standard CloudTrail management events alone.

Before S3 Protection existed, GuardDuty only looked at CloudTrail management events for S3 - things like `PutBucketPolicy` or `DeleteBucket`. That missed the actual data access patterns: who's downloading what, from where, and how much. S3 Protection fills that gap.

## What It Detects

S3 Protection monitors CloudTrail S3 data events (GetObject, PutObject, DeleteObject, etc.) and flags anomalies like:

- Access from unusual IP addresses or Tor exit nodes
- Unusually large data retrievals (potential exfiltration)
- API calls from known malicious IPs
- Access patterns that indicate discovery or enumeration
- S3 access from EC2 instances with suspicious behavior

The finding types include things like `Discovery:S3/MaliciousIPCaller`, `Exfiltration:S3/AnomalousBehavior`, `Impact:S3/AnomalousBehavior.Delete`, and several others.

## Enabling S3 Protection

### Via CLI

If you've already got GuardDuty running, enabling S3 Protection is a single API call.

This enables S3 data event analysis on your existing GuardDuty detector:

```bash
# Enable S3 Protection
aws guardduty update-detector \
  --detector-id abc123def456 \
  --features '[
    {
      "Name": "S3_DATA_EVENTS",
      "Status": "ENABLED"
    }
  ]'
```

Verify it's active:

```bash
aws guardduty get-detector --detector-id abc123def456 \
  --query 'Features[?Name==`S3_DATA_EVENTS`].{Name:Name,Status:Status}'
```

### Via Terraform

This Terraform configuration creates a GuardDuty detector with S3 Protection enabled:

```hcl
resource "aws_guardduty_detector" "main" {
  enable = true

  datasources {
    s3_logs {
      enable = true
    }
  }
}
```

### For New GuardDuty Setups

If you're enabling GuardDuty for the first time, S3 Protection is included by default. You don't need to do anything extra.

```bash
# Fresh GuardDuty setup includes S3 Protection
aws guardduty create-detector \
  --enable \
  --features '[
    {
      "Name": "S3_DATA_EVENTS",
      "Status": "ENABLED"
    }
  ]'
```

## Understanding S3 Findings

Let's go through the main finding types and what they mean.

### Exfiltration Findings

These are the ones that should make you sit up. They indicate someone might be stealing data.

- **Exfiltration:S3/AnomalousBehavior** - Unusual S3 API calls that could indicate data theft. Maybe a user who normally downloads a few files suddenly downloaded thousands.
- **Exfiltration:S3/MaliciousIPCaller** - S3 objects accessed from a known malicious IP address.

### Discovery Findings

These suggest someone is poking around, figuring out what's in your buckets.

- **Discovery:S3/MaliciousIPCaller** - S3 discovery APIs (ListBuckets, GetBucketAcl, etc.) called from a suspicious IP.
- **Discovery:S3/MaliciousIPCaller.Custom** - Same, but from an IP on your custom threat list.
- **Discovery:S3/AnomalousBehavior** - Unusual discovery API patterns that deviate from baseline behavior.

### Impact Findings

These indicate someone might be tampering with or destroying your data.

- **Impact:S3/AnomalousBehavior.Delete** - Unusual deletion patterns, like bulk deleting objects.
- **Impact:S3/AnomalousBehavior.Permission** - Unusual changes to bucket permissions.
- **Impact:S3/AnomalousBehavior.Write** - Unusual write patterns to S3.

## Querying S3 Findings

This retrieves all S3-related findings sorted by severity:

```bash
# List all S3 findings
aws guardduty list-findings \
  --detector-id abc123def456 \
  --finding-criteria '{
    "Criterion": {
      "service.additionalInfo.type": {
        "Eq": ["default"]
      },
      "resource.resourceType": {
        "Eq": ["S3Bucket"]
      }
    }
  }' \
  --sort-criteria '{
    "AttributeName": "severity",
    "OrderBy": "DESC"
  }'
```

Get detailed information about a specific finding:

```bash
# Get finding details
aws guardduty get-findings \
  --detector-id abc123def456 \
  --finding-ids "finding-id-here" \
  --query 'Findings[0].{
    Type:Type,
    Severity:Severity,
    Bucket:Resource.S3BucketDetails[0].Name,
    Actor:Service.Action.AwsApiCallAction.RemoteIpDetails,
    API:Service.Action.AwsApiCallAction.Api
  }'
```

## Setting Up Alerts

Don't just enable it and forget. Route findings to your team.

This EventBridge rule catches high-severity S3 findings and sends them to SNS:

```json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "type": [{
      "prefix": "Exfiltration:S3/"
    }, {
      "prefix": "Impact:S3/"
    }],
    "severity": [{
      "numeric": [">=", 7]
    }]
  }
}
```

Create the EventBridge rule:

```bash
# Create the event rule
aws events put-rule \
  --name guardduty-s3-alerts \
  --event-pattern '{
    "source": ["aws.guardduty"],
    "detail-type": ["GuardDuty Finding"],
    "detail": {
      "type": [{"prefix": "Exfiltration:S3/"}, {"prefix": "Impact:S3/"}],
      "severity": [{"numeric": [">=", 7]}]
    }
  }'

# Add SNS target
aws events put-targets \
  --rule guardduty-s3-alerts \
  --targets '[{
    "Id": "sns-target",
    "Arn": "arn:aws:sns:us-east-1:111111111111:security-alerts"
  }]'
```

## Automated Remediation

For serious findings, you might want to lock down the bucket immediately. Here's a Lambda function that restricts bucket access when exfiltration is detected.

This function adds a deny-all policy to a bucket when GuardDuty detects potential data exfiltration:

```python
import boto3
import json

s3 = boto3.client('s3')
sns = boto3.client('sns')

def handler(event, context):
    finding = event['detail']
    finding_type = finding['type']
    severity = finding['severity']

    # Get the affected bucket
    bucket_details = finding['resource']['s3BucketDetails'][0]
    bucket_name = bucket_details['name']

    print(f"S3 finding: {finding_type} on bucket {bucket_name} (severity: {severity})")

    # For high severity exfiltration, restrict access
    if severity >= 8 and 'Exfiltration' in finding_type:
        restrict_bucket(bucket_name)

    # Always notify
    notify_team(finding_type, bucket_name, severity, finding)

    return {'statusCode': 200}

def restrict_bucket(bucket_name):
    """Add a deny policy to block all access except from security role"""
    deny_policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "EmergencyDenyAll",
                "Effect": "Deny",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": f"arn:aws:s3:::{bucket_name}/*",
                "Condition": {
                    "StringNotLike": {
                        "aws:PrincipalArn": "arn:aws:iam::*:role/SecurityTeamRole"
                    }
                }
            }
        ]
    }

    s3.put_bucket_policy(
        Bucket=bucket_name,
        Policy=json.dumps(deny_policy)
    )
    print(f"Emergency deny policy applied to {bucket_name}")

def notify_team(finding_type, bucket_name, severity, finding):
    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:111111111111:security-alerts',
        Subject=f'[CRITICAL] S3 Exfiltration Alert: {bucket_name}',
        Message=json.dumps({
            'finding_type': finding_type,
            'bucket': bucket_name,
            'severity': severity,
            'action': finding['service']['action']
        }, indent=2, default=str)
    )
```

## Custom Threat Lists

You can add your own IP threat lists to GuardDuty, which enhances S3 Protection with your organization's threat intelligence.

This uploads a threat list to GuardDuty that will generate findings when any listed IP accesses your resources:

```bash
# Upload threat list to S3 first
aws s3 cp threat-ips.txt s3://my-security-bucket/threat-lists/ips.txt

# Create threat intel set in GuardDuty
aws guardduty create-threat-intel-set \
  --detector-id abc123def456 \
  --name "CustomThreatIPs" \
  --format TXT \
  --location s3://my-security-bucket/threat-lists/ips.txt \
  --activate
```

The threat list is a plain text file with one IP or CIDR per line.

## Multi-Account Setup

Enable S3 Protection across all organization accounts:

```bash
aws guardduty update-organization-configuration \
  --detector-id abc123def456 \
  --features '[
    {
      "Name": "S3_DATA_EVENTS",
      "AutoEnable": "ALL"
    }
  ]'
```

## Cost Considerations

S3 Protection analyzes CloudTrail S3 data events. If you have buckets with massive numbers of object-level API calls, this can add up. The pricing is based on the number of events analyzed.

To estimate costs, check how many S3 data events you're generating:

```bash
# Check GuardDuty usage statistics
aws guardduty get-usage-statistics \
  --detector-id abc123def456 \
  --usage-statistic-type SUM_BY_DATA_SOURCE \
  --usage-criteria '{
    "DataSources": ["S3_LOGS"]
  }'
```

## Wrapping Up

S3 Protection is one of those features you should just turn on. The cost is relatively modest for most workloads, and the visibility it provides into data access patterns is invaluable. Combined with [GuardDuty Malware Protection](https://oneuptime.com/blog/post/guardduty-malware-protection-ec2/view) and [EKS Protection](https://oneuptime.com/blog/post/guardduty-eks-protection/view), you get comprehensive threat detection across your AWS environment. Feed those findings into [OneUptime](https://oneuptime.com) for unified incident management and you've got a solid security monitoring foundation.
