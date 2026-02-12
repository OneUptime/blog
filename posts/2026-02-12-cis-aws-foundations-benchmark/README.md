# How to Implement CIS AWS Foundations Benchmark

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Security, CIS Benchmark, Compliance

Description: Step-by-step guide to implementing the CIS AWS Foundations Benchmark, covering IAM, logging, monitoring, and networking controls for better AWS security.

---

The CIS AWS Foundations Benchmark is one of the most respected security standards for AWS environments. Published by the Center for Internet Security, it lays out a clear set of controls that every AWS account should have in place. The benchmark covers identity management, logging, monitoring, and networking - basically the foundations you need before worrying about anything else.

In this guide, we'll implement the key controls from the benchmark. I won't cover every single one (there are over 50), but we'll tackle the most impactful sections.

## Understanding the Benchmark Structure

The CIS AWS Foundations Benchmark is organized into four main sections:

1. **Identity and Access Management** - IAM policies, MFA, password policies
2. **Logging** - CloudTrail, Config, and related services
3. **Monitoring** - CloudWatch alarms for critical changes
4. **Networking** - VPC security controls

Each control gets a severity level and tells you whether it can be automated or requires manual review.

## Section 1: Identity and Access Management

### Avoid Using the Root Account

The root account has unrestricted access and can't be limited by IAM policies. CIS recommends never using it for day-to-day tasks.

Set up a CloudWatch alarm to detect root account usage:

```bash
# Create a CloudWatch Logs metric filter for root account usage
aws logs put-metric-filter \
  --log-group-name "CloudTrail/DefaultLogGroup" \
  --filter-name "RootAccountUsage" \
  --filter-pattern '{$.userIdentity.type="Root" && $.userIdentity.invokedBy NOT EXISTS && $.eventType != "AwsServiceEvent"}' \
  --metric-transformations \
    metricName=RootAccountUsageCount,metricNamespace=CISBenchmark,metricValue=1

# Create an alarm that triggers on any root usage
aws cloudwatch put-metric-alarm \
  --alarm-name "CIS-RootAccountUsage" \
  --metric-name RootAccountUsageCount \
  --namespace CISBenchmark \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:SecurityAlerts"
```

### Enforce MFA for All IAM Users

Every IAM user with console access should have MFA enabled. You can enforce this with a policy that denies all actions until MFA is configured.

This IAM policy forces users to set up MFA before they can do anything else:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowViewAccountInfo",
      "Effect": "Allow",
      "Action": [
        "iam:GetAccountPasswordPolicy",
        "iam:ListVirtualMFADevices"
      ],
      "Resource": "*"
    },
    {
      "Sid": "AllowManageOwnMFA",
      "Effect": "Allow",
      "Action": [
        "iam:CreateVirtualMFADevice",
        "iam:EnableMFADevice",
        "iam:ResyncMFADevice",
        "iam:ListMFADevices"
      ],
      "Resource": [
        "arn:aws:iam::*:mfa/${aws:username}",
        "arn:aws:iam::*:user/${aws:username}"
      ]
    },
    {
      "Sid": "DenyAllExceptMFASetup",
      "Effect": "Deny",
      "NotAction": [
        "iam:CreateVirtualMFADevice",
        "iam:EnableMFADevice",
        "iam:GetUser",
        "iam:ListMFADevices",
        "iam:ListVirtualMFADevices",
        "iam:ResyncMFADevice",
        "sts:GetSessionToken"
      ],
      "Resource": "*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

### Set a Strong Password Policy

CIS recommends specific password policy settings:

```bash
# Configure the account password policy per CIS recommendations
aws iam update-account-password-policy \
  --minimum-password-length 14 \
  --require-symbols \
  --require-numbers \
  --require-uppercase-characters \
  --require-lowercase-characters \
  --allow-users-to-change-password \
  --max-password-age 90 \
  --password-reuse-prevention 24
```

### Remove Unused Credentials

Find and disable credentials that haven't been used in 90 days:

```bash
# Generate and download the credential report
aws iam generate-credential-report
aws iam get-credential-report --query 'Content' --output text | base64 -d > cred-report.csv

# This Python snippet finds users with old credentials
python3 -c "
import csv
from datetime import datetime, timedelta, timezone

threshold = datetime.now(timezone.utc) - timedelta(days=90)

with open('cred-report.csv') as f:
    reader = csv.DictReader(f)
    for row in reader:
        last_used = row.get('password_last_used', 'N/A')
        if last_used not in ['N/A', 'no_information', 'not_supported']:
            used_date = datetime.fromisoformat(last_used.replace('+00:00', '+00:00'))
            if used_date < threshold:
                print(f'Stale user: {row[\"user\"]} - last used: {last_used}')
"
```

## Section 2: Logging

### Enable CloudTrail in All Regions

CloudTrail should be enabled in every region, including regions you don't actively use. Attackers love spinning up resources in regions nobody watches.

```bash
# Create a multi-region trail
aws cloudtrail create-trail \
  --name "organization-trail" \
  --s3-bucket-name "cloudtrail-logs-123456789012" \
  --is-multi-region-trail \
  --enable-log-file-validation \
  --include-global-service-events \
  --kms-key-id "arn:aws:kms:us-east-1:123456789012:key/abc123"

# Start logging
aws cloudtrail start-logging --name "organization-trail"
```

The `--enable-log-file-validation` flag is important. It creates digest files that let you verify log files haven't been tampered with.

### Enable AWS Config

AWS Config records configuration changes to your resources. It's required for many CIS controls.

```bash
# Enable Config with all resource recording
aws configservice put-configuration-recorder \
  --configuration-recorder name=default,roleARN=arn:aws:iam::123456789012:role/ConfigRole \
  --recording-group allSupported=true,includeGlobalResourceTypes=true

# Set up the delivery channel
aws configservice put-delivery-channel \
  --delivery-channel '{
    "name": "default",
    "s3BucketName": "config-logs-123456789012",
    "configSnapshotDeliveryProperties": {
      "deliveryFrequency": "TwentyFour_Hours"
    }
  }'

# Start recording
aws configservice start-configuration-recorder --configuration-recorder-name default
```

## Section 3: Monitoring Alarms

CIS recommends CloudWatch alarms for several critical events. Here are the most important ones.

This script creates metric filters and alarms for key security events:

```bash
# Unauthorized API calls
aws logs put-metric-filter \
  --log-group-name "CloudTrail/DefaultLogGroup" \
  --filter-name "UnauthorizedAPICalls" \
  --filter-pattern '{($.errorCode="*UnauthorizedAccess*") || ($.errorCode="AccessDenied*")}' \
  --metric-transformations metricName=UnauthorizedAPICalls,metricNamespace=CISBenchmark,metricValue=1

# IAM policy changes
aws logs put-metric-filter \
  --log-group-name "CloudTrail/DefaultLogGroup" \
  --filter-name "IAMPolicyChanges" \
  --filter-pattern '{($.eventName=DeleteGroupPolicy) || ($.eventName=DeleteRolePolicy) || ($.eventName=DeleteUserPolicy) || ($.eventName=PutGroupPolicy) || ($.eventName=PutRolePolicy) || ($.eventName=PutUserPolicy) || ($.eventName=CreatePolicy) || ($.eventName=DeletePolicy) || ($.eventName=AttachRolePolicy) || ($.eventName=DetachRolePolicy) || ($.eventName=AttachUserPolicy) || ($.eventName=DetachUserPolicy) || ($.eventName=AttachGroupPolicy) || ($.eventName=DetachGroupPolicy)}' \
  --metric-transformations metricName=IAMPolicyChanges,metricNamespace=CISBenchmark,metricValue=1

# Console sign-in without MFA
aws logs put-metric-filter \
  --log-group-name "CloudTrail/DefaultLogGroup" \
  --filter-name "ConsoleSignInWithoutMFA" \
  --filter-pattern '{($.eventName="ConsoleLogin") && ($.additionalEventData.MFAUsed != "Yes")}' \
  --metric-transformations metricName=ConsoleSignInWithoutMFA,metricNamespace=CISBenchmark,metricValue=1
```

## Section 4: Networking

### Restrict Default Security Group

The default security group in every VPC should deny all traffic. Many people forget that the default security group allows all outbound traffic and all inbound traffic from other resources in the same group.

```bash
# Remove all rules from the default security group
DEFAULT_SG=$(aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=default" "Name=vpc-id,Values=vpc-abc123" \
  --query "SecurityGroups[0].GroupId" --output text)

# Revoke all ingress rules
aws ec2 revoke-security-group-ingress \
  --group-id $DEFAULT_SG \
  --protocol all \
  --source-group $DEFAULT_SG

# Revoke all egress rules
aws ec2 revoke-security-group-egress \
  --group-id $DEFAULT_SG \
  --protocol all \
  --cidr 0.0.0.0/0
```

### Enable VPC Flow Logs

Every VPC should have flow logs enabled. They capture network traffic metadata that's invaluable for security investigations. For a detailed walkthrough, see our post on [enabling and configuring VPC Flow Logs](https://oneuptime.com/blog/post/enable-configure-vpc-flow-logs/view).

## Automating CIS Compliance Checks

Rather than checking each control manually, use AWS Config conformance packs. AWS provides a CIS conformance pack that checks most controls automatically.

```bash
# Deploy the CIS conformance pack
aws configservice put-conformance-pack \
  --conformance-pack-name "CIS-AWS-Foundations" \
  --template-s3-uri "s3://config-conformance-packs/CIS-AWS-Foundations.yaml" \
  --delivery-s3-bucket "config-conformance-results-123456789012"
```

You can also use AWS Security Hub, which has a built-in CIS benchmark standard:

```bash
# Enable Security Hub
aws securityhub enable-security-hub

# Enable the CIS standard
aws securityhub batch-enable-standards \
  --standards-subscription-requests '[
    {"StandardsArn": "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0"}
  ]'
```

Security Hub gives you a compliance score and highlights which controls are failing, making it easy to prioritize remediation.

## Wrapping Up

Implementing the CIS AWS Foundations Benchmark isn't a one-time project. It's an ongoing practice. Start with the high-impact controls - MFA enforcement, CloudTrail logging, and security group lockdown. Then work your way through the remaining controls over time.

The automation tools AWS provides (Config conformance packs, Security Hub, and [Audit Manager](https://oneuptime.com/blog/post/aws-audit-manager-compliance-auditing/view)) make it much easier to maintain compliance continuously rather than scrambling before each audit.
