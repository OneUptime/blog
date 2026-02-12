# How to Use AWS Free Tier Effectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Free Tier, Cost Optimization, Getting Started

Description: A practical guide to maximizing AWS Free Tier benefits including which services are included, common pitfalls, and how to avoid unexpected charges.

---

AWS Free Tier is genuinely useful, but it's also a minefield of unexpected charges if you're not careful. There are three different types of free tier offers, each with different rules, and it's remarkably easy to accidentally exceed them. I've seen people rack up hundreds of dollars thinking they were within free tier limits.

Let's make sure that doesn't happen to you.

## The Three Types of Free Tier

AWS Free Tier isn't one thing - it's three categories of offers:

**Always Free** - These don't expire. They're available to all AWS accounts forever. Examples include:
- 1 million Lambda requests per month
- 25GB DynamoDB storage
- 10 custom CloudWatch metrics

**12-Month Free** - Available for 12 months after you create your AWS account. These are the ones most people think of:
- 750 hours/month of t2.micro or t3.micro EC2
- 750 hours/month of RDS db.t2.micro or db.t3.micro
- 5GB S3 standard storage
- 30GB EBS storage

**Free Trials** - Short-term free access to specific services when you first use them:
- Amazon Redshift: 2-month free trial
- Amazon SageMaker: 2-month free trial
- Amazon Inspector: 15-day free trial

## Setting Up Free Tier Alerts

Before you do anything else, set up billing alerts. AWS provides a specific Free Tier usage alert:

```bash
# Enable billing alerts in your account preferences
aws ce update-preferences

# Create a budget that alerts at 80% of free tier usage
aws budgets create-budget \
  --account-id $(aws sts get-caller-identity --query Account --output text) \
  --budget '{
    "BudgetName": "FreeTierMonitor",
    "BudgetLimit": {"Amount": "1", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 0.01
      },
      "Subscribers": [
        {"SubscriptionType": "EMAIL", "Address": "your-email@example.com"}
      ]
    }
  ]'
```

Also enable the Free Tier usage alerts in the AWS Console under Billing Preferences. These send you an email when you approach 85% of a specific free tier limit.

## EC2 Free Tier: Getting It Right

The EC2 free tier gives you 750 hours per month of t2.micro or t3.micro instances. That's enough for one instance running 24/7. But there are traps.

**The 750 hours are shared across all instances.** If you run two t3.micro instances, each uses 750 hours per month, totaling 1,500 hours. You'll be charged for 750 of those.

**Region matters.** The instance must be in a region where t2.micro or t3.micro is available as free tier. Most regions work, but check.

**EBS volumes count separately.** Each instance gets a root volume. Free tier covers 30GB of EBS storage total. A single 30GB volume is fine. Two 20GB volumes total 40GB, and you'll pay for the extra 10GB.

Here's how to launch a properly configured free tier instance:

```bash
# Launch a free tier eligible instance with a properly sized volume
aws ec2 run-instances \
  --image-id ami-0a1b2c3d4e5f67890 \
  --instance-type t3.micro \
  --key-name my-key \
  --security-group-ids sg-0a1b2c3d4e5f67890 \
  --block-device-mappings '[
    {
      "DeviceName": "/dev/xvda",
      "Ebs": {
        "VolumeSize": 8,
        "VolumeType": "gp3",
        "DeleteOnTermination": true
      }
    }
  ]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=free-tier-instance}]'
```

Notice the `DeleteOnTermination: true` flag. Without it, the EBS volume persists after you terminate the instance and continues charging you.

## RDS Free Tier: Watch the Multi-AZ Trap

RDS gives you 750 hours per month of a db.t3.micro instance. The most common mistake is enabling Multi-AZ deployment, which effectively doubles your instance hours (750 x 2 = 1,500) and takes you over the free tier.

```bash
# Create a free tier eligible RDS instance - note MultiAZ is false
aws rds create-db-instance \
  --db-instance-identifier free-tier-db \
  --db-instance-class db.t3.micro \
  --engine mysql \
  --master-username admin \
  --master-user-password your-secure-password \
  --allocated-storage 20 \
  --no-multi-az \
  --backup-retention-period 0 \
  --no-auto-minor-version-upgrade \
  --storage-type gp2
```

Setting `backup-retention-period` to 0 disables automated backups, which would consume additional storage. For a free tier database, this is usually fine since it's likely a development environment.

## Lambda Free Tier: Actually Generous

Lambda's always-free tier is quite generous:
- 1 million requests per month
- 400,000 GB-seconds of compute per month

At 128MB memory, that's 3.2 million seconds of execution time, or about 37 days of continuous execution. For most learning and development purposes, you'll never exceed this.

```python
# A simple Lambda function that stays well within free tier
import json

def lambda_handler(event, context):
    # Keep memory at 128MB and execution short
    result = {
        'message': 'Hello from Lambda',
        'event': event
    }
    return {
        'statusCode': 200,
        'body': json.dumps(result)
    }
```

The thing to watch is memory allocation. If you set a function to 1024MB, you only get 400,000 seconds (about 4.6 days) instead of 3.2 million seconds at 128MB.

## S3 Free Tier: Storage and Requests

S3 free tier (12-month) includes:
- 5GB standard storage
- 20,000 GET requests
- 2,000 PUT requests

The request limits catch people off guard. If you host a static website on S3 and get moderate traffic, you can blow through 20,000 GET requests in a day.

```bash
# Check your current S3 usage
aws s3 ls --summarize --human-readable --recursive s3://my-bucket/
```

For static websites, put CloudFront in front of S3. CloudFront's free tier gives you 1TB of data transfer and 10 million requests per month, which is far more generous than S3 alone.

## DynamoDB Free Tier: Always Free

DynamoDB's free tier is always free (not just 12 months) and includes:
- 25 GB of storage
- 25 read capacity units
- 25 write capacity units
- Enough for about 200 million requests per month

This makes DynamoDB an excellent choice for small projects:

```bash
# Create a DynamoDB table within free tier limits
aws dynamodb create-table \
  --table-name MyApp \
  --attribute-definitions AttributeName=PK,AttributeType=S \
  --key-schema AttributeName=PK,KeyType=HASH \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

Use provisioned mode rather than on-demand if you want to stay in free tier. On-demand mode doesn't qualify for the free tier capacity units.

## Services That Look Free But Aren't

Several services have hidden costs that catch people:

**Elastic IP addresses.** An EIP attached to a running instance is free. An EIP that's allocated but not attached costs $0.005/hour ($3.60/month). Always release EIPs you're not using.

```bash
# Find unattached Elastic IPs
aws ec2 describe-addresses \
  --query "Addresses[?AssociationId==null].{IP: PublicIp, AllocID: AllocationId}"

# Release unattached EIPs
aws ec2 release-address --allocation-id eipalloc-0a1b2c3d4e5f67890
```

**NAT Gateways.** Not included in free tier at all. $0.045/hour ($32/month) plus data processing. Use your instance's public IP instead during development.

**CloudWatch Logs.** Ingestion costs $0.50/GB. If your Lambda functions log heavily, this adds up.

**Data transfer.** Free tier includes 100GB of data transfer out per month (always free across all services). Heavy API usage can exceed this.

## Monthly Checklist

Run through this checklist monthly to stay within free tier:

```bash
# Check for running instances you may have forgotten
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query "Reservations[].Instances[].{ID: InstanceId, Type: InstanceType, Launch: LaunchTime}" \
  --output table

# Check for unattached EBS volumes
aws ec2 describe-volumes \
  --filters "Name=status,Values=available" \
  --query "Volumes[].{ID: VolumeId, Size: Size, Type: VolumeType}"

# Check for unattached Elastic IPs
aws ec2 describe-addresses \
  --query "Addresses[?AssociationId==null]"

# Check for running RDS instances
aws rds describe-db-instances \
  --query "DBInstances[].{ID: DBInstanceIdentifier, Class: DBInstanceClass, Status: DBInstanceStatus}"
```

For a more automated approach to tracking free tier usage, see our guide on [tracking and avoiding AWS Free Tier overages](https://oneuptime.com/blog/post/track-and-avoid-aws-free-tier-overages/view).

## Key Takeaways

AWS Free Tier is a great way to learn and build small projects without spending money. The key rules: set up billing alerts immediately, understand the difference between always-free and 12-month offers, watch out for hidden costs like EIPs and NAT Gateways, and audit your resources monthly. Most unexpected charges come from resources you forgot about, not from intentional usage.
