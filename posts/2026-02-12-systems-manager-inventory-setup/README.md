# How to Set Up Systems Manager Inventory

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Systems Manager, Inventory, DevOps

Description: Set up AWS Systems Manager Inventory to collect and query metadata about your managed instances, including installed software, network configs, and custom data.

---

Knowing what's running on your infrastructure sounds like it should be straightforward. But when you've got dozens or hundreds of instances - some running Ubuntu, some Amazon Linux, some Windows - keeping track of installed packages, running services, network configurations, and file versions becomes a real challenge. AWS Systems Manager Inventory solves this by automatically collecting metadata from your managed instances and giving you a central place to query it.

Let's get it set up and actually useful.

## What Does Inventory Collect?

Out of the box, Systems Manager Inventory can gather several categories of data from your instances:

- **Applications** - Installed software and packages (RPMs, APT packages, Windows programs)
- **AWS Components** - AWS tools installed on the instance (SSM Agent version, CloudWatch agent, etc.)
- **Network Configuration** - IP addresses, DNS settings, MAC addresses
- **Windows Updates** - Installed updates and patches (Windows only)
- **Instance Details** - OS name, version, hostname, domain
- **Services** - Running services and their states (Windows only)
- **Windows Roles** - Server roles and features (Windows only)
- **Custom Inventory** - Whatever you want to track

The data gets collected by the SSM Agent that's already running on your instances. All you need to do is tell it what to collect and how often.

## Prerequisites

Before setting up Inventory, make sure your instances meet these requirements:

1. **SSM Agent installed** - Most recent Amazon Linux, Ubuntu, and Windows AMIs come with it pre-installed
2. **IAM instance profile** - Your instances need an IAM role with the `AmazonSSMManagedInstanceCore` managed policy
3. **Connectivity** - Instances need to reach the Systems Manager endpoints (via internet or VPC endpoints)

You can verify which instances are already managed with this command:

```bash
# List all instances managed by Systems Manager
aws ssm describe-instance-information \
  --query "InstanceInformationList[].{Id:InstanceId,Name:ComputerName,Platform:PlatformType,AgentVersion:AgentVersion}" \
  --output table
```

## Creating an Inventory Association

The way you tell Systems Manager to collect inventory data is through a State Manager Association. This is basically a scheduled task that runs the `AWS-GatherSoftwareInventory` document on your instances.

Here's how to create one that targets all managed instances:

```bash
# Create an inventory association for all managed instances
aws ssm create-association \
  --name "AWS-GatherSoftwareInventory" \
  --targets "Key=InstanceIds,Values=*" \
  --schedule-expression "rate(12 hours)" \
  --parameters '{
    "applications": ["Enabled"],
    "awsComponents": ["Enabled"],
    "networkConfig": ["Enabled"],
    "instanceDetailedInformation": ["Enabled"],
    "services": ["Enabled"],
    "windowsUpdates": ["Enabled"]
  }'
```

A few things to note about this command. The `Values=*` wildcard targets every managed instance. The schedule runs every 12 hours, which is a reasonable default. You can go as frequent as every 30 minutes if you need fresher data.

If you'd prefer to target specific instances by tag, change the targets:

```bash
# Target instances with a specific tag
aws ssm create-association \
  --name "AWS-GatherSoftwareInventory" \
  --targets "Key=tag:Environment,Values=production" \
  --schedule-expression "rate(6 hours)" \
  --parameters '{
    "applications": ["Enabled"],
    "awsComponents": ["Enabled"],
    "networkConfig": ["Enabled"]
  }'
```

## Setting Up from the Console

If you prefer the console, navigate to Systems Manager, then Inventory in the left sidebar. Click "Setup Inventory" and you'll get a form where you can:

1. Pick which data types to collect
2. Choose your targets (all instances, specific tags, or manual selection)
3. Set the collection schedule
4. Optionally specify an S3 bucket for data sync

The console approach is fine for a one-time setup, but I'd recommend using the CLI or CloudFormation for reproducibility.

## Querying Inventory Data

Once data starts flowing in (give it a few minutes after creating the association), you can query it through the CLI or console.

To see what software is installed on a specific instance:

```bash
# Get installed applications for an instance
aws ssm list-inventory-entries \
  --instance-id "i-0abc123def456789" \
  --type-name "AWS:Application" \
  --query "Entries[].{Name:Name,Version:Version,Publisher:Publisher}" \
  --output table
```

To get network configuration:

```bash
# Get network configuration for an instance
aws ssm list-inventory-entries \
  --instance-id "i-0abc123def456789" \
  --type-name "AWS:Network" \
  --output json
```

## Using Resource Data Sync for Centralized Queries

The real power comes when you sync inventory data to an S3 bucket and query it with Athena. This lets you run SQL queries across all your instances - things like "which instances have OpenSSL version less than 3.0?" or "how many instances are running Python 2?"

First, create the S3 bucket and policy:

```bash
# Create the sync bucket
aws s3 mb s3://my-inventory-data-bucket

# Create a resource data sync
aws ssm create-resource-data-sync \
  --sync-name "inventory-to-s3" \
  --s3-destination '{
    "BucketName": "my-inventory-data-bucket",
    "Prefix": "ssm-inventory",
    "SyncFormat": "JsonSerDe",
    "Region": "us-east-1"
  }'
```

The bucket policy needs to allow Systems Manager to write to it:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SSMBucketPermissionsCheck",
      "Effect": "Allow",
      "Principal": {
        "Service": "ssm.amazonaws.com"
      },
      "Action": "s3:GetBucketAcl",
      "Resource": "arn:aws:s3:::my-inventory-data-bucket"
    },
    {
      "Sid": "SSMBucketDelivery",
      "Effect": "Allow",
      "Principal": {
        "Service": "ssm.amazonaws.com"
      },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::my-inventory-data-bucket/*",
      "Condition": {
        "StringEquals": {
          "s3:x-amz-acl": "bucket-owner-full-control"
        }
      }
    }
  ]
}
```

## Querying with Athena

Once data lands in S3, set up an Athena table to query it. AWS provides a Glue crawler that can auto-detect the schema, or you can create the table manually.

Here's a sample Athena query to find instances with a specific package:

```sql
-- Find all instances with nginx installed
SELECT
  resourceid AS instance_id,
  name,
  version,
  publisher
FROM ssm_inventory.aws_application
WHERE LOWER(name) LIKE '%nginx%'
ORDER BY version DESC;
```

And a query to find instances running outdated agent versions:

```sql
-- Find instances with SSM Agent older than a specific version
SELECT
  resourceid AS instance_id,
  name,
  version
FROM ssm_inventory.aws_component
WHERE name = 'amazon-ssm-agent'
  AND version < '3.2.0.0'
ORDER BY version ASC;
```

## Custom Inventory

Sometimes the built-in types aren't enough. Maybe you need to track which version of your application is deployed on each instance, or which configuration files are present. Custom inventory lets you push arbitrary data into the inventory system.

Here's how to put custom inventory data onto an instance:

```bash
# Push custom inventory data to an instance
aws ssm put-inventory \
  --instance-id "i-0abc123def456789" \
  --items '[
    {
      "TypeName": "Custom:DeployedApp",
      "SchemaVersion": "1.0",
      "CaptureTime": "2026-02-12T00:00:00Z",
      "Content": [
        {
          "AppName": "web-api",
          "Version": "2.4.1",
          "DeployedBy": "deploy-pipeline",
          "DeployedAt": "2026-02-11T14:30:00Z"
        }
      ]
    }
  ]'
```

The `TypeName` must start with `Custom:` and the schema version should be `1.0`. You can include any key-value pairs you want in the Content array.

To automate this, you could add a step to your deployment pipeline that calls `put-inventory` after a successful deploy. This way your inventory always reflects what's actually running.

## Setting Up Inventory with CloudFormation

For infrastructure-as-code setups, here's a CloudFormation template:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Systems Manager Inventory setup

Resources:
  InventoryAssociation:
    Type: AWS::SSM::Association
    Properties:
      Name: AWS-GatherSoftwareInventory
      AssociationName: gather-inventory-all
      ScheduleExpression: rate(12 hours)
      Targets:
        - Key: InstanceIds
          Values:
            - '*'
      Parameters:
        applications:
          - Enabled
        awsComponents:
          - Enabled
        networkConfig:
          - Enabled
        instanceDetailedInformation:
          - Enabled

  InventoryDataSync:
    Type: AWS::SSM::ResourceDataSync
    Properties:
      SyncName: inventory-sync
      S3Destination:
        BucketName: !Ref InventoryBucket
        SyncFormat: JsonSerDe
        BucketRegion: !Ref AWS::Region

  InventoryBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub '${AWS::AccountId}-ssm-inventory'
      LifecycleConfiguration:
        Rules:
          - Id: ExpireOldData
            Status: Enabled
            ExpirationInDays: 90
```

## Monitoring Inventory Collection

You'll want to know if inventory collection stops working. Set up a CloudWatch alarm on the association compliance:

```bash
# Check association execution status
aws ssm list-association-executions \
  --association-id "your-association-id" \
  --filters "Key=Status,Value=Failed,Type=EQUAL" \
  --query "AssociationExecutions[].{Time:CreatedTime,Status:Status,DetailedStatus:DetailedStatus}" \
  --output table
```

If you're using OneUptime for monitoring, you can integrate these checks into your dashboard alongside your other infrastructure health metrics. Check out our post on [monitoring with CloudWatch](https://oneuptime.com/blog/post/monitor-efs-cloudwatch/view) for more patterns.

## Practical Tips

After running Inventory across hundreds of instances, here are a few things I've learned:

- **Start with 12-hour collection intervals** and only increase frequency if you actually need fresher data. More frequent collection means more API calls and slightly higher SSM Agent CPU usage.
- **Use tags to segment your inventory** - production and dev instances probably don't need the same collection schedules.
- **Set up S3 lifecycle rules** on your sync bucket. You probably don't need 2-year-old inventory snapshots.
- **Custom inventory is underused** - it's a great way to track deployment versions, feature flags, or config drift without building a separate system.

## Wrapping Up

Systems Manager Inventory gives you visibility into what's actually running across your fleet. The setup takes maybe 15 minutes, and once it's running you've got a queryable database of every package, service, and configuration on every instance. Pair it with Athena for fleet-wide queries, and you'll wonder how you ever managed without it.
