# How to Use AWS License Manager for License Tracking

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, License Manager, Compliance, Cost Management

Description: Learn how to use AWS License Manager to track, manage, and enforce software license usage across your AWS environment and on-premises servers.

---

Software licensing in the cloud is a headache. You've got Windows Server licenses, SQL Server licenses, Oracle databases, and various third-party software, each with different licensing models. Some charge per core, some per socket, some per user. Some vendors let you bring your own license (BYOL), others require you to use AWS-provided licenses. Tracking all this manually is a recipe for compliance violations and surprise audit bills.

AWS License Manager gives you a centralized way to track license usage, enforce limits, and avoid over-deployment. It works across EC2, RDS, on-premises servers (with AWS Systems Manager), and even AWS Marketplace subscriptions.

## Why License Tracking Matters

Let's be real - most organizations have a fuzzy picture of their license usage. They buy licenses, deploy software, and hope the numbers work out when the vendor comes knocking for an audit. In the cloud, this problem gets worse because it's so easy to spin up new instances.

The risks include:

- **Over-licensing** - paying for licenses you don't use (wasted money)
- **Under-licensing** - using more licenses than you own (compliance violations, audit penalties)
- **Wrong license type** - deploying on instance types that don't match your agreement (e.g., running SQL Server Enterprise on instances with more cores than your license covers)

## Setting Up License Manager

### Step 1: Create License Configurations

A license configuration defines the rules for a specific software license. You specify the licensing model, limits, and enforcement behavior.

```bash
# Create a license configuration for Windows Server
aws license-manager create-license-configuration \
  --name "Windows Server 2022 Datacenter" \
  --description "BYOL Windows Server Datacenter licenses" \
  --license-counting-type "Core" \
  --license-count 256 \
  --license-count-hard-limit \
  --license-rules "allowedTenancies#EC2-DedicatedHost" \
  --tags "Key=Vendor,Value=Microsoft" "Key=Product,Value=WindowsServer"
```

The `--license-count-hard-limit` flag is important. When set, License Manager prevents launching new instances that would exceed the count. Without it, you'll get alerts but instances still launch.

Create configurations for each licensed software product.

```bash
# SQL Server Standard license (per core)
aws license-manager create-license-configuration \
  --name "SQL Server 2022 Standard" \
  --description "BYOL SQL Server Standard - per core" \
  --license-counting-type "Core" \
  --license-count 64 \
  --license-count-hard-limit \
  --license-rules "licenseAffinityToHost#14d"

# Oracle Database Enterprise (per vCPU)
aws license-manager create-license-configuration \
  --name "Oracle Database Enterprise" \
  --description "Oracle Database Enterprise Edition" \
  --license-counting-type "vCPU" \
  --license-count 32 \
  --license-count-hard-limit

# Per-instance licensing
aws license-manager create-license-configuration \
  --name "Third-Party App License" \
  --description "Per-instance license for monitoring agent" \
  --license-counting-type "Instance" \
  --license-count 100 \
  --license-count-hard-limit
```

### Step 2: Associate License Configurations with AMIs

Link your license configurations to AMIs so that any instance launched from that AMI automatically counts against the license.

```bash
# Associate a license configuration with an AMI
aws license-manager update-license-specifications-for-resource \
  --resource-arn "arn:aws:ec2:us-east-1::image/ami-windows-server-123" \
  --add-license-specifications \
    "LicenseConfigurationArn=arn:aws:license-manager:us-east-1:123456789:license-configuration/lic-abc123"
```

You can also associate with launch templates for more automated tracking.

```bash
# Create a launch template with license specification
aws ec2 create-launch-template \
  --launch-template-name "windows-server-byol" \
  --launch-template-data '{
    "ImageId": "ami-windows-server-123",
    "InstanceType": "m5.xlarge",
    "LicenseSpecifications": [
      {
        "LicenseConfigurationArn": "arn:aws:license-manager:us-east-1:123456789:license-configuration/lic-abc123"
      }
    ]
  }'
```

### Step 3: Set Up Cross-Account License Tracking

If you're running a multi-account environment with AWS Organizations, you can manage licenses centrally.

```bash
# In the management account, update License Manager settings
aws license-manager update-service-settings \
  --organization-configuration '{
    "EnableIntegration": true
  }' \
  --enable-cross-accounts-discovery
```

This lets you see license usage across all accounts from the management account.

### Step 4: Track On-Premises Servers

License Manager can track licenses on on-premises servers too, using AWS Systems Manager. Install the SSM agent on your on-premises servers and register them as managed instances.

```bash
# Create a hybrid activation for on-premises servers
aws ssm create-activation \
  --default-instance-name "on-prem-server" \
  --iam-role "SSMServiceRole" \
  --registration-limit 50 \
  --tags "Key=Environment,Value=on-premises"
```

Once registered, these servers can be associated with license configurations just like EC2 instances.

## Monitoring License Usage

### Dashboard View

```bash
# Get license configuration usage summary
aws license-manager get-license-configuration \
  --license-configuration-arn "arn:aws:license-manager:us-east-1:123456789:license-configuration/lic-abc123" \
  --query "{Name:Name, ConsumedLicenses:ConsumedLicenses, LicenseCount:LicenseCount, Status:Status}"

# List all license configurations with usage
aws license-manager list-license-configurations \
  --query "LicenseConfigurations[].{Name:Name, Used:ConsumedLicenses, Total:LicenseCount, Type:LicenseCountingType}" \
  --output table
```

### Programmatic Monitoring

Here's a Python script that checks license utilization and alerts when you're getting close to limits.

```python
import boto3

def check_license_usage(threshold_pct=80):
    """
    Check all license configurations and alert when usage
    exceeds the specified threshold percentage.
    """
    client = boto3.client('license-manager')
    sns = boto3.client('sns')

    response = client.list_license_configurations()

    alerts = []
    for config in response['LicenseConfigurations']:
        name = config['Name']
        total = config.get('LicenseCount', 0)
        consumed = config.get('ConsumedLicenses', 0)

        if total == 0:
            continue

        utilization = (consumed / total) * 100

        print(f"{name}: {consumed}/{total} ({utilization:.1f}%)")

        if utilization >= threshold_pct:
            alerts.append({
                'name': name,
                'consumed': consumed,
                'total': total,
                'utilization': utilization
            })

    if alerts:
        message = "License utilization alerts:\n\n"
        for alert in alerts:
            message += (
                f"- {alert['name']}: {alert['consumed']}/{alert['total']} "
                f"({alert['utilization']:.1f}%)\n"
            )

        sns.publish(
            TopicArn='arn:aws:sns:us-east-1:123456789:license-alerts',
            Subject='License Utilization Warning',
            Message=message
        )
        print(f"\nSent alert for {len(alerts)} license(s)")

    return alerts

# Run this on a schedule (Lambda + EventBridge)
check_license_usage(threshold_pct=80)
```

### Set Up CloudWatch Alarms

```bash
# Create an alarm for license utilization
aws cloudwatch put-metric-alarm \
  --alarm-name "windows-license-utilization" \
  --namespace "AWS/LicenseManager" \
  --metric-name "ConsumedLicenses" \
  --dimensions "Name=LicenseConfigurationId,Value=lic-abc123" \
  --statistic "Maximum" \
  --period 3600 \
  --threshold 200 \
  --comparison-operator "GreaterThanThreshold" \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789:license-alerts"
```

## Enforcement Rules

License Manager can prevent launches that would violate license terms.

```bash
# Update a license configuration with strict enforcement
aws license-manager update-license-configuration \
  --license-configuration-arn "arn:aws:license-manager:us-east-1:123456789:license-configuration/lic-abc123" \
  --license-count 256 \
  --license-count-hard-limit \
  --license-rules \
    "allowedTenancies#EC2-DedicatedHost" \
    "allowedInstanceTypes#m5.xlarge#m5.2xlarge#r5.xlarge"
```

The `allowedInstanceTypes` rule restricts which instance types can use the license. This is useful for licenses that are priced per core - you don't want someone spinning up a 96-core instance against your 64-core license pool.

## Generating Compliance Reports

```bash
# List license usage by resource
aws license-manager list-usage-for-license-configuration \
  --license-configuration-arn "arn:aws:license-manager:us-east-1:123456789:license-configuration/lic-abc123" \
  --query "LicenseConfigurationUsageList[].{Resource:ResourceArn, Type:ResourceType, Consumed:ConsumedLicenses, Account:ResourceOwnerId}" \
  --output table
```

For vendor audits, you can export this data to a CSV and present it alongside your purchase records.

## Integration with AWS Marketplace

License Manager also tracks licenses purchased through AWS Marketplace. When you buy a software subscription from the Marketplace, the license is automatically tracked.

```bash
# List granted licenses (from Marketplace or direct grants)
aws license-manager list-received-licenses \
  --query "Licenses[].{Name:LicenseName, Issuer:Issuer.Name, Status:Status}" \
  --output table
```

## Monitoring and Alerting

For comprehensive monitoring of your license usage alongside the rest of your infrastructure, [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-logs-setup/view) can help consolidate alerts from License Manager with your other operational metrics.

## Wrapping Up

License tracking isn't exciting work, but it's the kind of thing that saves you from a painful (and expensive) audit finding. AWS License Manager automates what most organizations try to manage in spreadsheets. Set up your license configurations, associate them with AMIs and launch templates, enable hard limits for enforcement, and run regular utilization reports. The initial setup takes an afternoon, and after that, it runs itself. When the auditors come around, you'll have clean data ready to go instead of scrambling to count instances.
