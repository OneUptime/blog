# How to Configure EFS Lifecycle Management for Cost Optimization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Cost Optimization, Lifecycle Management, Storage

Description: Set up EFS lifecycle management to automatically move infrequently accessed files to cheaper storage classes and save up to 92% on storage costs.

---

EFS Standard storage costs about $0.30 per GB per month. That's reasonable for actively used data, but you're probably paying that rate for files that haven't been touched in months. Old log files, historical data, past deployment artifacts, uploaded content that nobody looks at - it's all sitting in Standard storage at full price.

EFS lifecycle management automatically moves files to cheaper storage classes based on how recently they were accessed. Infrequent Access (IA) storage costs about $0.016 per GB per month - that's a 92% savings. The catch is that there's a small per-access charge when you read IA files, but for data that's rarely touched, the savings are massive.

## How EFS Storage Classes Work

EFS has four storage classes:

| Storage Class | Cost (GB/month) | Best For |
|---------------|-----------------|----------|
| Standard | ~$0.30 | Frequently accessed files |
| Infrequent Access (IA) | ~$0.016 | Files accessed a few times per quarter |
| One Zone Standard | ~$0.16 | Frequently accessed, single-AZ |
| One Zone IA | ~$0.0133 | Rarely accessed, single-AZ |

One Zone classes are cheaper because they don't replicate across Availability Zones. Use them only for data you can recreate or that doesn't need the durability of multi-AZ replication.

## Enabling Lifecycle Management

Lifecycle management is configured through lifecycle policies. You set rules for when to move files to IA and (optionally) when to move them back to Standard.

Transition to IA after 30 days of no access:

```bash
# Enable lifecycle transition to IA after 30 days
aws efs put-lifecycle-configuration \
  --file-system-id "fs-0abc123def456789" \
  --lifecycle-policies '[
    {"TransitionToIA": "AFTER_30_DAYS"}
  ]'
```

Available transition periods: 1, 7, 14, 30, 60, or 90 days.

## Adding Transition Back to Standard

If you want files to automatically move back to Standard storage when they're accessed, add a `TransitionToPrimaryStorageClass` policy:

```bash
# Move to IA after 30 days, back to Standard on access
aws efs put-lifecycle-configuration \
  --file-system-id "fs-0abc123def456789" \
  --lifecycle-policies '[
    {"TransitionToIA": "AFTER_30_DAYS"},
    {"TransitionToPrimaryStorageClass": "AFTER_1_ACCESS"}
  ]'
```

The `AFTER_1_ACCESS` setting means the first time a file in IA is read, it moves back to Standard. This is useful if your access patterns are cyclical - some files might be cold for months but then become hot again.

Whether to enable the transition back depends on your workload:

- **Enable it** if files that get accessed once will likely be accessed again soon
- **Don't enable it** if accesses are truly one-off (like compliance audits or occasional data pulls)

## Lifecycle Management for One Zone Storage

If your file system uses One Zone storage, the policies work the same way:

```bash
# Transition to One Zone IA after 14 days
aws efs put-lifecycle-configuration \
  --file-system-id "fs-0abc123def456789" \
  --lifecycle-policies '[
    {"TransitionToIA": "AFTER_14_DAYS"},
    {"TransitionToPrimaryStorageClass": "AFTER_1_ACCESS"}
  ]'
```

## Checking Current Lifecycle Configuration

```bash
# View current lifecycle policies
aws efs describe-lifecycle-configuration \
  --file-system-id "fs-0abc123def456789" \
  --output json
```

## Monitoring Storage Class Distribution

Understanding how your data is distributed across storage classes helps you tune your lifecycle policies. Use CloudWatch metrics:

```bash
# Check Standard storage usage
aws cloudwatch get-metric-statistics \
  --namespace "AWS/EFS" \
  --metric-name "StorageBytesStandard" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123def456789" "Name=StorageClass,Value=Total" \
  --start-time "$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)" \
  --end-time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  --period 86400 \
  --statistics Average
```

A more comprehensive view:

```bash
# Get storage breakdown by class
aws efs describe-file-systems \
  --file-system-id "fs-0abc123def456789" \
  --query "FileSystems[0].SizeInBytes.{
    TotalBytes: Value,
    StandardBytes: ValueInStandard,
    IABytes: ValueInIA
  }" \
  --output json
```

This shows you exactly how much data is in each storage class. Let's write a quick script to calculate costs:

```python
import boto3

def calculate_efs_costs(file_system_id, region='us-east-1'):
    """
    Calculate monthly storage costs for an EFS file system
    based on current storage class distribution.
    """
    efs = boto3.client('efs', region_name=region)

    fs = efs.describe_file_systems(FileSystemId=file_system_id)
    size_info = fs['FileSystems'][0]['SizeInBytes']

    total_gb = size_info['Value'] / (1024 ** 3)
    standard_gb = size_info.get('ValueInStandard', 0) / (1024 ** 3)
    ia_gb = size_info.get('ValueInIA', 0) / (1024 ** 3)

    # Pricing (us-east-1, approximate)
    standard_price = 0.30  # per GB/month
    ia_price = 0.016       # per GB/month

    standard_cost = standard_gb * standard_price
    ia_cost = ia_gb * ia_price
    total_cost = standard_cost + ia_cost

    # What it would cost without lifecycle management
    all_standard_cost = total_gb * standard_price
    savings = all_standard_cost - total_cost

    print(f"File System: {file_system_id}")
    print(f"{'=' * 45}")
    print(f"Standard storage: {standard_gb:.1f} GB  (${standard_cost:.2f}/mo)")
    print(f"IA storage:       {ia_gb:.1f} GB  (${ia_cost:.2f}/mo)")
    print(f"Total:            {total_gb:.1f} GB  (${total_cost:.2f}/mo)")
    print(f"")
    print(f"Without lifecycle: ${all_standard_cost:.2f}/mo")
    print(f"Monthly savings:   ${savings:.2f}/mo ({savings/all_standard_cost*100:.0f}%)")

calculate_efs_costs('fs-0abc123def456789')
```

## IA Access Costs

There's a charge every time you read data from IA storage: $0.01 per GB read. This is important to factor in. If a file in IA gets read frequently, the access charges might exceed what you'd pay for Standard storage.

The break-even point: if a 1 GB file is read more than about 28 times per month, it's cheaper to keep it in Standard storage ($0.30/mo) rather than IA ($0.016/mo storage + $0.01/read * N reads).

For most workloads, files in IA are accessed infrequently enough that the storage savings far outweigh the access charges. But if you have automated processes that scan the entire file system regularly (backups, security scanners, antivirus), those reads will hit IA files and incur charges.

## CloudFormation Configuration

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: EFS with lifecycle management

Resources:
  FileSystem:
    Type: AWS::EFS::FileSystem
    Properties:
      Encrypted: true
      PerformanceMode: generalPurpose
      ThroughputMode: bursting
      LifecyclePolicies:
        - TransitionToIA: AFTER_30_DAYS
        - TransitionToPrimaryStorageClass: AFTER_1_ACCESS
      FileSystemTags:
        - Key: Name
          Value: cost-optimized-efs
```

## Terraform Configuration

```hcl
resource "aws_efs_file_system" "optimized" {
  encrypted = true

  lifecycle_policy {
    transition_to_ia = "AFTER_30_DAYS"
  }

  lifecycle_policy {
    transition_to_primary_storage_class = "AFTER_1_ACCESS"
  }

  tags = {
    Name = "cost-optimized-efs"
  }
}
```

## Choosing the Right Transition Period

The right transition period depends on your access patterns:

**1 day** - Aggressive. Good for write-once-read-rarely data like log files or audit trails where you know files won't be accessed after the first day.

**7 days** - Good for development environments where files from last week's work are unlikely to be needed.

**14 days** - A reasonable middle ground for most workloads.

**30 days** - The safe default. Files untouched for a month are usually not actively needed.

**60-90 days** - Conservative. Use this if you're unsure about access patterns or if IA read charges are a concern.

You can check what transition period makes the most sense by looking at file access patterns:

```bash
# Find files not accessed in the last 30 days (run on a mounted instance)
find /mnt/efs -type f -atime +30 -exec du -ch {} + | tail -1
# Shows total size of files not accessed in 30 days

# Compare with total size
du -sh /mnt/efs
```

## Disabling Lifecycle Management

If you want to stop transitioning files to IA:

```bash
# Remove all lifecycle policies
aws efs put-lifecycle-configuration \
  --file-system-id "fs-0abc123def456789" \
  --lifecycle-policies '[]'
```

Note that this won't move files back from IA to Standard. Files already in IA stay there unless you enable `TransitionToPrimaryStorageClass` and access them, or manually copy them.

## Monitoring with CloudWatch Alarms

Set up alerts to track your IA storage ratio and detect unexpected patterns:

```bash
# Create a dashboard-ready metric filter
aws cloudwatch put-metric-alarm \
  --alarm-name "efs-ia-ratio-check" \
  --alarm-description "Alert if IA percentage drops unexpectedly (files being moved back to Standard)" \
  --namespace "AWS/EFS" \
  --metric-name "StorageBytes" \
  --dimensions "Name=FileSystemId,Value=fs-0abc123def456789" "Name=StorageClass,Value=IA" \
  --statistic Average \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 0 \
  --comparison-operator LessThanOrEqualToThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:ops-alerts"
```

For comprehensive monitoring of all EFS metrics, see our guide on [monitoring EFS with CloudWatch](https://oneuptime.com/blog/post/monitor-efs-cloudwatch/view).

## Best Practices

1. **Enable lifecycle management on every EFS file system** - there's almost always cold data that can be moved to IA.
2. **Start with 30-day transition** and adjust based on observed patterns.
3. **Monitor IA access charges** in Cost Explorer to make sure they're not offsetting your savings.
4. **Be careful with automated scanners** that read every file - they'll trigger IA read charges across the board.
5. **Use the transition-back policy carefully** - only enable it if files are likely to become hot again after being accessed.
6. **Consider One Zone storage classes** for non-critical data to save even more.

## Wrapping Up

EFS lifecycle management is probably the single easiest cost optimization you can do. It takes one API call to enable, runs completely automatically, and typically saves 50-80% on storage costs depending on what percentage of your data is cold. There's no risk - files in IA are still immediately accessible, just with a tiny access charge. If you're not using it, you're overpaying.
