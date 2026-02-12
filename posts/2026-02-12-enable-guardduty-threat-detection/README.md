# How to Enable Amazon GuardDuty for Threat Detection

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, GuardDuty, Security, Threat Detection

Description: Learn how to enable and configure Amazon GuardDuty to automatically detect threats, compromised instances, and malicious activity in your AWS environment.

---

You can have perfect IAM policies, encrypted everything, and security groups locked down tight - and still get compromised. Attackers find ways in through stolen credentials, supply chain attacks, or vulnerabilities you didn't know existed. That's why you need a threat detection service running continuously, watching for signs of compromise.

Amazon GuardDuty fills that role. It analyzes multiple data sources - CloudTrail logs, VPC Flow Logs, DNS query logs, and more - using machine learning and threat intelligence to identify malicious activity. It's fully managed, requires no infrastructure, and can be enabled with a single API call.

## What GuardDuty Detects

GuardDuty generates findings across three main categories:

**Reconnaissance** - Someone is probing your environment, scanning ports, or making unusual API calls to discover resources.

**Instance Compromise** - An EC2 instance is communicating with known command-and-control servers, mining cryptocurrency, or exhibiting other malicious behavior.

**Account Compromise** - IAM credentials are being used from unusual locations, at unusual times, or in unusual patterns that suggest they've been stolen.

Some specific examples:
- An EC2 instance communicating with a known bitcoin mining pool
- API calls coming from a Tor exit node
- Credential exfiltration attempts from an EC2 instance
- Port scanning originating from one of your instances
- IAM access keys being used from a different country than usual
- S3 buckets being accessed from unusual IP addresses

## Enabling GuardDuty

Enabling GuardDuty is remarkably simple. One API call and it starts analyzing your environment.

```bash
# Enable GuardDuty in the current region
aws guardduty create-detector \
  --enable \
  --finding-publishing-frequency FIFTEEN_MINUTES
```

The `finding-publishing-frequency` determines how often findings are published to EventBridge. Options are `FIFTEEN_MINUTES`, `ONE_HOUR`, or `SIX_HOURS`. For security, go with `FIFTEEN_MINUTES`.

Check that it's enabled.

```bash
# List your detectors
aws guardduty list-detectors

# Get detector details
aws guardduty get-detector --detector-id YOUR_DETECTOR_ID
```

## Enabling Protection Plans

GuardDuty has several optional protection plans that analyze additional data sources. Enable the ones relevant to your environment.

```bash
# Get your detector ID first
DETECTOR_ID=$(aws guardduty list-detectors --query 'DetectorIds[0]' --output text)

# Enable S3 protection (monitors S3 data access events)
aws guardduty update-detector \
  --detector-id $DETECTOR_ID \
  --data-sources '{
    "S3Logs": {"Enable": true}
  }'
```

For Kubernetes, EBS malware scanning, and Lambda protection, use the features configuration.

```bash
# Enable EKS protection
aws guardduty update-detector \
  --detector-id $DETECTOR_ID \
  --features '[
    {
      "Name": "EKS_AUDIT_LOGS",
      "Status": "ENABLED"
    },
    {
      "Name": "EKS_RUNTIME_MONITORING",
      "Status": "ENABLED",
      "AdditionalConfiguration": [{
        "Name": "EKS_ADDON_MANAGEMENT",
        "Status": "ENABLED"
      }]
    }
  ]'

# Enable EBS malware protection
aws guardduty update-detector \
  --detector-id $DETECTOR_ID \
  --features '[
    {
      "Name": "EBS_MALWARE_PROTECTION",
      "Status": "ENABLED"
    }
  ]'

# Enable Lambda network activity monitoring
aws guardduty update-detector \
  --detector-id $DETECTOR_ID \
  --features '[
    {
      "Name": "LAMBDA_NETWORK_LOGS",
      "Status": "ENABLED"
    }
  ]'

# Enable RDS login activity monitoring
aws guardduty update-detector \
  --detector-id $DETECTOR_ID \
  --features '[
    {
      "Name": "RDS_LOGIN_EVENTS",
      "Status": "ENABLED"
    }
  ]'
```

## Terraform Configuration

Here's the complete Terraform setup for GuardDuty with all protection plans.

```hcl
resource "aws_guardduty_detector" "main" {
  enable                       = true
  finding_publishing_frequency = "FIFTEEN_MINUTES"

  datasources {
    s3_logs {
      enable = true
    }
    kubernetes {
      audit_logs {
        enable = true
      }
    }
    malware_protection {
      scan_ec2_instance_with_findings {
        ebs_volumes {
          enable = true
        }
      }
    }
  }
}
```

## Understanding Findings

GuardDuty findings have a severity level from 0 to 10:

- **Low (0.1 - 3.9)** - Suspicious activity that may not indicate a real threat
- **Medium (4.0 - 6.9)** - Activity that deviates from normal but might have a benign explanation
- **High (7.0 - 8.9)** - Strong indicators of compromise that need immediate investigation
- **Critical (9.0 - 10.0)** - Active compromise requiring emergency response

List current findings.

```bash
# Get all findings
aws guardduty list-findings \
  --detector-id $DETECTOR_ID \
  --finding-criteria '{
    "Criterion": {
      "severity": {
        "Gte": 7
      }
    }
  }'

# Get finding details
aws guardduty get-findings \
  --detector-id $DETECTOR_ID \
  --finding-ids '["finding-id-here"]'
```

A typical finding looks something like this.

```json
{
  "Type": "UnauthorizedAccess:EC2/MaliciousIPCaller.Custom",
  "Severity": 8.0,
  "Title": "EC2 instance communicating with a known malicious IP",
  "Description": "EC2 instance i-0abc123 is communicating with IP 198.51.100.1 which is on a threat intelligence list.",
  "Resource": {
    "ResourceType": "Instance",
    "InstanceDetails": {
      "InstanceId": "i-0abc123def456",
      "InstanceType": "m5.large",
      "LaunchTime": "2026-02-10T12:00:00Z"
    }
  },
  "Service": {
    "Action": {
      "NetworkConnectionAction": {
        "ConnectionDirection": "OUTBOUND",
        "RemoteIpDetails": {
          "IpAddressV4": "198.51.100.1",
          "Country": {"CountryName": "Unknown"}
        }
      }
    }
  }
}
```

## Setting Up Notifications

You need to know about findings immediately. Set up EventBridge to route high-severity findings to your team.

```bash
# Create EventBridge rule for high-severity findings
aws events put-rule \
  --name guardduty-high-severity \
  --event-pattern '{
    "source": ["aws.guardduty"],
    "detail-type": ["GuardDuty Finding"],
    "detail": {
      "severity": [{"numeric": [">=", 7]}]
    }
  }'

# Send to SNS
aws events put-targets \
  --rule guardduty-high-severity \
  --targets "Id"="1","Arn"="arn:aws:sns:us-east-1:111111111111:security-alerts"
```

For better notification formatting, use a Lambda function as the target.

```python
import json
import boto3

sns = boto3.client('sns')

def handler(event, context):
    finding = event['detail']

    severity = finding['severity']
    finding_type = finding['type']
    title = finding['title']
    description = finding['description']
    region = finding['region']
    account = finding['accountId']

    # Get resource details
    resource = finding.get('resource', {})
    resource_type = resource.get('resourceType', 'Unknown')

    message = f"""
GuardDuty Finding - Severity {severity}
{'=' * 50}

Type: {finding_type}
Title: {title}

Account: {account}
Region: {region}
Resource Type: {resource_type}

Description:
{description}

Full finding:
{json.dumps(finding, indent=2, default=str)[:3000]}
"""

    sns.publish(
        TopicArn='arn:aws:sns:us-east-1:111111111111:security-alerts',
        Subject=f'[Severity {severity}] GuardDuty: {title[:80]}',
        Message=message
    )
```

## Adding Custom Threat Intelligence

You can add your own threat intelligence lists (IP addresses or domains) that GuardDuty will check against.

```bash
# Create a threat intel set from a file in S3
aws guardduty create-threat-intel-set \
  --detector-id $DETECTOR_ID \
  --name CustomThreatList \
  --format TXT \
  --location s3://my-security-bucket/threat-intel/bad-ips.txt \
  --activate
```

The file should contain one IP address or CIDR range per line.

## Trusted IP Lists

If you have IP addresses that generate false positives (like your VPN endpoints or office IPs), add them as a trusted IP list.

```bash
aws guardduty create-ip-set \
  --detector-id $DETECTOR_ID \
  --name TrustedIPs \
  --format TXT \
  --location s3://my-security-bucket/trusted-ips/office-ips.txt \
  --activate
```

## Cost Considerations

GuardDuty pricing is based on the volume of data analyzed:
- CloudTrail management events: per million events
- VPC Flow Logs and DNS logs: per GB analyzed
- S3 data events: per million events
- EKS audit logs: per million events

The first 30 days are free, which gives you time to evaluate the cost for your environment. Check the estimated cost in the GuardDuty console under "Usage."

For most accounts, GuardDuty costs between $10-100/month. High-traffic environments with lots of S3 data events can be more expensive.

## What's Next

Once GuardDuty is running, you'll want to [set up notifications for findings](https://oneuptime.com/blog/post/configure-guardduty-findings-notifications/view), learn to [suppress false positives](https://oneuptime.com/blog/post/suppress-guardduty-false-positives/view), and if you're managing multiple accounts, [enable GuardDuty across all of them](https://oneuptime.com/blog/post/guardduty-multiple-aws-accounts/view). For a complete security posture, [integrate GuardDuty with Security Hub](https://oneuptime.com/blog/post/integrate-guardduty-security-hub/view) to centralize findings alongside Config, CloudTrail, and other services.
