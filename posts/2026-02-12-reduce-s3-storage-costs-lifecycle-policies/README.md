# How to Reduce S3 Storage Costs with Lifecycle Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Cost Optimization, Storage

Description: A practical guide to using S3 lifecycle policies to automatically transition objects to cheaper storage classes and delete expired data to reduce storage costs.

---

S3 storage costs seem small per GB, but they add up. Once you're storing terabytes of logs, backups, and historical data, those $0.023/GB/month charges for Standard storage become a significant line item. The thing is, most of that data doesn't need to be in Standard storage. Logs from last month don't need millisecond access times. Backups from last year can sit in Glacier. And temporary files from completed jobs should be deleted entirely.

Lifecycle policies automate this. You define rules, and S3 automatically moves objects to cheaper storage or deletes them based on age. Set it once and stop paying for storage you don't need.

## Understanding S3 Storage Classes

Before writing lifecycle policies, know what's available and what it costs.

| Storage Class | Use Case | Retrieval Time | Cost (per GB/mo) |
|---|---|---|---|
| Standard | Frequently accessed data | Milliseconds | $0.023 |
| Intelligent-Tiering | Unknown access patterns | Milliseconds | $0.023 (auto-tiers) |
| Standard-IA | Infrequent access (>30 days) | Milliseconds | $0.0125 |
| One Zone-IA | Non-critical, infrequent | Milliseconds | $0.010 |
| Glacier Instant Retrieval | Archive, rare access | Milliseconds | $0.004 |
| Glacier Flexible | Archive, hours acceptable | 1-12 hours | $0.0036 |
| Glacier Deep Archive | Long-term archive | 12-48 hours | $0.00099 |

The savings are dramatic. Moving from Standard to Glacier Deep Archive cuts storage costs by 95%. Even moving to Standard-IA saves 46%.

## Creating Basic Lifecycle Policies

Let's start with the most common lifecycle scenarios.

### Move Logs to Cheaper Storage and Eventually Delete

This policy transitions log files through storage tiers and deletes them after a year.

```json
{
  "Rules": [
    {
      "ID": "log-lifecycle",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 730
      }
    }
  ]
}
```

Apply it with the CLI.

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-application-logs \
  --lifecycle-configuration file://lifecycle.json
```

### Delete Temporary Files After 7 Days

Temporary files from batch jobs, build artifacts, and intermediate processing results shouldn't stick around.

```json
{
  "Rules": [
    {
      "ID": "cleanup-temp-files",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "tmp/"
      },
      "Expiration": {
        "Days": 7
      }
    }
  ]
}
```

### Clean Up Incomplete Multipart Uploads

This one is often overlooked. Failed multipart uploads leave invisible fragments in your bucket that still cost money.

```json
{
  "Rules": [
    {
      "ID": "abort-incomplete-multipart",
      "Status": "Enabled",
      "Filter": {
        "Prefix": ""
      },
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 3
      }
    }
  ]
}
```

## Terraform Configuration

Here's a comprehensive lifecycle configuration in Terraform.

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "my-company-data"
}

resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  # Rule 1: Application logs
  rule {
    id     = "log-lifecycle"
    status = "Enabled"

    filter {
      prefix = "logs/"
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }

  # Rule 2: Database backups
  rule {
    id     = "backup-lifecycle"
    status = "Enabled"

    filter {
      prefix = "backups/"
    }

    transition {
      days          = 7
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    transition {
      days          = 180
      storage_class = "DEEP_ARCHIVE"
    }

    # Keep backups for 7 years (compliance)
    expiration {
      days = 2555
    }
  }

  # Rule 3: Analytics data
  rule {
    id     = "analytics-lifecycle"
    status = "Enabled"

    filter {
      prefix = "analytics/"
    }

    transition {
      days          = 60
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 365
      storage_class = "GLACIER_IR"  # Glacier Instant Retrieval
    }
  }

  # Rule 4: Clean up temp files
  rule {
    id     = "temp-cleanup"
    status = "Enabled"

    filter {
      prefix = "tmp/"
    }

    expiration {
      days = 3
    }
  }

  # Rule 5: Abort incomplete multipart uploads (all prefixes)
  rule {
    id     = "abort-multipart"
    status = "Enabled"

    filter {
      prefix = ""
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 3
    }
  }

  # Rule 6: Delete old versions (for versioned buckets)
  rule {
    id     = "version-cleanup"
    status = "Enabled"

    filter {
      prefix = ""
    }

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }

    noncurrent_version_expiration {
      noncurrent_days = 365
    }
  }
}
```

## Tag-Based Lifecycle Rules

Instead of relying only on prefixes, you can use object tags to control lifecycle behavior. This is useful when objects from different retention categories share the same prefix.

```hcl
rule {
  id     = "short-retention"
  status = "Enabled"

  filter {
    tag {
      key   = "retention"
      value = "short"
    }
  }

  expiration {
    days = 30
  }
}

rule {
  id     = "long-retention"
  status = "Enabled"

  filter {
    tag {
      key   = "retention"
      value = "long"
    }
  }

  transition {
    days          = 90
    storage_class = "GLACIER"
  }

  expiration {
    days = 2555  # 7 years
  }
}
```

Tag objects when you upload them.

```python
import boto3

s3 = boto3.client("s3")

# Upload with retention tag
s3.put_object(
    Bucket="my-company-data",
    Key="reports/2026/q1-report.pdf",
    Body=report_data,
    Tagging="retention=long"
)

# Upload temp file with short retention
s3.put_object(
    Bucket="my-company-data",
    Key="processing/batch-123.csv",
    Body=csv_data,
    Tagging="retention=short"
)
```

## Analyzing Your Bucket for Savings

Before creating policies, understand what's in your bucket and how it's being accessed.

This script analyzes a bucket's storage distribution and identifies savings opportunities.

```python
import boto3
from collections import defaultdict
from datetime import datetime, timedelta

s3 = boto3.client("s3")

def analyze_bucket(bucket_name, sample_size=10000):
    """Analyze bucket contents for lifecycle optimization opportunities."""
    stats = {
        "total_size": 0,
        "total_objects": 0,
        "by_prefix": defaultdict(lambda: {"size": 0, "count": 0, "oldest": None}),
        "by_storage_class": defaultdict(lambda: {"size": 0, "count": 0}),
        "age_distribution": defaultdict(lambda: {"size": 0, "count": 0})
    }

    paginator = s3.get_paginator("list_objects_v2")
    count = 0

    for page in paginator.paginate(Bucket=bucket_name):
        for obj in page.get("Contents", []):
            count += 1
            if count > sample_size:
                break

            size = obj["Size"]
            key = obj["Key"]
            modified = obj["LastModified"].replace(tzinfo=None)
            storage_class = obj.get("StorageClass", "STANDARD")

            # Top-level prefix
            prefix = key.split("/")[0] if "/" in key else "(root)"

            stats["total_size"] += size
            stats["total_objects"] += 1

            stats["by_prefix"][prefix]["size"] += size
            stats["by_prefix"][prefix]["count"] += 1
            if not stats["by_prefix"][prefix]["oldest"] or modified < stats["by_prefix"][prefix]["oldest"]:
                stats["by_prefix"][prefix]["oldest"] = modified

            stats["by_storage_class"][storage_class]["size"] += size
            stats["by_storage_class"][storage_class]["count"] += 1

            # Age bucket
            age_days = (datetime.utcnow() - modified).days
            if age_days < 30:
                age_bucket = "< 30 days"
            elif age_days < 90:
                age_bucket = "30-90 days"
            elif age_days < 365:
                age_bucket = "90-365 days"
            else:
                age_bucket = "> 365 days"

            stats["age_distribution"][age_bucket]["size"] += size
            stats["age_distribution"][age_bucket]["count"] += 1

    # Print analysis
    gb = 1024 * 1024 * 1024
    total_gb = stats["total_size"] / gb

    print(f"\nBucket Analysis: {bucket_name}")
    print(f"Total: {stats['total_objects']:,} objects, {total_gb:.2f} GB")

    print(f"\nBy Storage Class:")
    for cls, data in sorted(stats["by_storage_class"].items()):
        print(f"  {cls}: {data['size']/gb:.2f} GB ({data['count']:,} objects)")

    print(f"\nBy Age:")
    for age, data in stats["age_distribution"].items():
        pct = data["size"] / stats["total_size"] * 100 if stats["total_size"] > 0 else 0
        print(f"  {age}: {data['size']/gb:.2f} GB ({pct:.1f}%)")

    # Estimate savings
    standard_data = stats["by_storage_class"].get("STANDARD", {"size": 0})
    standard_gb = standard_data["size"] / gb

    old_standard = sum(
        data["size"] for age, data in stats["age_distribution"].items()
        if age in ("90-365 days", "> 365 days")
    ) / gb

    if old_standard > 0:
        current_monthly = old_standard * 0.023
        optimized_monthly = old_standard * 0.004  # Glacier Instant Retrieval price
        savings = current_monthly - optimized_monthly
        print(f"\nPotential Savings:")
        print(f"  {old_standard:.2f} GB of data older than 90 days in Standard")
        print(f"  Current monthly cost: ${current_monthly:,.2f}")
        print(f"  With Glacier IR: ${optimized_monthly:,.2f}")
        print(f"  Monthly savings: ${savings:,.2f}")

analyze_bucket("my-company-data")
```

## S3 Intelligent-Tiering

If you're not sure about access patterns, S3 Intelligent-Tiering automatically moves objects between access tiers based on actual usage. There's no retrieval fee, and the monitoring fee is $0.0025 per 1,000 objects per month.

```hcl
rule {
  id     = "intelligent-tiering"
  status = "Enabled"

  filter {
    prefix = "user-uploads/"
  }

  transition {
    days          = 0  # Move immediately
    storage_class = "INTELLIGENT_TIERING"
  }
}
```

Configure the Intelligent-Tiering archive tiers.

```bash
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket my-company-data \
  --id "auto-archive" \
  --intelligent-tiering-configuration '{
    "Id": "auto-archive",
    "Status": "Enabled",
    "Tierings": [
      {
        "AccessTier": "ARCHIVE_ACCESS",
        "Days": 90
      },
      {
        "AccessTier": "DEEP_ARCHIVE_ACCESS",
        "Days": 180
      }
    ]
  }'
```

## Important Gotchas

**Minimum storage duration charges**: Standard-IA has a 30-day minimum, Glacier has 90 days, and Deep Archive has 180 days. If you delete or transition objects before the minimum, you still pay for the full period.

**Transition order matters**: Objects must transition from hotter to cooler tiers. You can't go from Glacier back to Standard-IA via lifecycle rules.

**Retrieval costs**: Cheaper storage means retrieval costs. Glacier Flexible Retrieval charges $0.01/GB for standard retrieval. Deep Archive charges $0.02/GB. Factor this into your calculations.

**Small objects**: Objects smaller than 128 KB in Standard-IA are charged as 128 KB. Don't transition small objects to IA tiers - the minimum charge makes it more expensive.

For more on managing S3 and other AWS costs, see our guides on [setting up Cost Explorer](https://oneuptime.com/blog/post/2026-02-12-setup-aws-cost-explorer-cost-analysis/view) and [setting up AWS Budgets](https://oneuptime.com/blog/post/2026-02-12-setup-aws-budgets-cost-alerts/view).

## Wrapping Up

S3 lifecycle policies are one of the easiest cost optimizations you can make. Analyze your bucket to understand the age and access patterns of your data, then create rules that move data through storage tiers as it ages. Don't forget to clean up incomplete multipart uploads and old object versions. The combination of automatic transitions and expiration rules means your storage costs stay optimized without manual intervention. Set it up once and let S3 do the work.
