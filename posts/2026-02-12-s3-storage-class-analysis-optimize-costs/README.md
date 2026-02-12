# How to Set Up S3 Storage Class Analysis to Optimize Costs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Cost Optimization, Storage

Description: Configure S3 Storage Class Analysis to identify data that can be moved to cheaper storage classes, reducing your S3 bill without impacting access patterns.

---

Most S3 buckets are over-provisioned. Data gets uploaded to Standard storage and stays there forever, even when nobody has accessed it in months. S3 Storage Class Analysis watches your access patterns and tells you exactly which data can be moved to cheaper storage classes like Infrequent Access or Glacier.

Instead of guessing which lifecycle rules to create, let the data tell you.

## S3 Storage Classes Quick Overview

Before diving into analysis, here's what you're optimizing between.

| Storage Class | Use Case | Cost (per GB/month) | Retrieval Fee |
|---|---|---|---|
| Standard | Frequently accessed | ~$0.023 | None |
| Intelligent-Tiering | Unknown access patterns | ~$0.023 + monitoring fee | None |
| Standard-IA | Infrequent access (30+ days) | ~$0.0125 | Per GB retrieved |
| One Zone-IA | Non-critical infrequent data | ~$0.01 | Per GB retrieved |
| Glacier Instant Retrieval | Rare access, millisecond retrieval | ~$0.004 | Per GB retrieved |
| Glacier Flexible Retrieval | Archive, minutes to hours | ~$0.0036 | Per GB + per request |
| Glacier Deep Archive | Long-term archive | ~$0.00099 | Per GB + hours to retrieve |

The savings between Standard and IA is about 45%. Between Standard and Glacier Deep Archive, it's over 95%.

## Setting Up Storage Class Analysis

Enable analysis on a bucket to start collecting access pattern data.

Analyze the entire bucket.

```bash
# Enable storage class analysis for the whole bucket
aws s3api put-bucket-analytics-configuration \
  --bucket my-data-bucket \
  --id entire-bucket-analysis \
  --analytics-configuration '{
    "Id": "entire-bucket-analysis",
    "StorageClassAnalysis": {
      "DataExport": {
        "OutputSchemaVersion": "V_1",
        "Destination": {
          "S3BucketDestination": {
            "Format": "CSV",
            "BucketAccountId": "123456789012",
            "Bucket": "arn:aws:s3:::analytics-output-bucket",
            "Prefix": "storage-analysis/"
          }
        }
      }
    }
  }'
```

Analyze a specific prefix - useful when different data categories have different access patterns.

```bash
# Analyze only the logs prefix
aws s3api put-bucket-analytics-configuration \
  --bucket my-data-bucket \
  --id logs-analysis \
  --analytics-configuration '{
    "Id": "logs-analysis",
    "Filter": {
      "Prefix": "logs/"
    },
    "StorageClassAnalysis": {
      "DataExport": {
        "OutputSchemaVersion": "V_1",
        "Destination": {
          "S3BucketDestination": {
            "Format": "CSV",
            "BucketAccountId": "123456789012",
            "Bucket": "arn:aws:s3:::analytics-output-bucket",
            "Prefix": "storage-analysis/logs/"
          }
        }
      }
    }
  }'

# Analyze objects tagged with a specific value
aws s3api put-bucket-analytics-configuration \
  --bucket my-data-bucket \
  --id media-analysis \
  --analytics-configuration '{
    "Id": "media-analysis",
    "Filter": {
      "Tag": {
        "Key": "content-type",
        "Value": "media"
      }
    },
    "StorageClassAnalysis": {
      "DataExport": {
        "OutputSchemaVersion": "V_1",
        "Destination": {
          "S3BucketDestination": {
            "Format": "CSV",
            "BucketAccountId": "123456789012",
            "Bucket": "arn:aws:s3:::analytics-output-bucket",
            "Prefix": "storage-analysis/media/"
          }
        }
      }
    }
  }'
```

## Understanding the Analysis Results

Storage Class Analysis needs at least 30 days of data before making recommendations. The analysis results are exported daily as CSV files to your specified S3 location.

The exported data includes:

- **Date** - When the data point was recorded
- **ConfigId** - Your analysis configuration ID
- **Filter** - The prefix or tag filter
- **ObjectCount** - Total objects matching the filter
- **ObjectSizeBytes** - Total size of matching objects
- **ObjectAge** groupings showing access frequency for different age ranges

You can also view recommendations in the S3 console, which shows a graph of accessed vs non-accessed data over time.

## Interpreting Recommendations

After 30 days, check the analysis results.

```bash
# List analytics configurations
aws s3api list-bucket-analytics-configurations --bucket my-data-bucket

# Check if analysis reports have been generated
aws s3 ls s3://analytics-output-bucket/storage-analysis/ --recursive
```

The analysis tells you what percentage of your data is "infrequently accessed" - meaning it hasn't been accessed for 30+ days. If a large portion of your data is infrequent, you'll save money by transitioning it.

## Creating Lifecycle Rules Based on Analysis

Once you have data-backed recommendations, create lifecycle rules to automate transitions.

Move data to Standard-IA after 30 days and Glacier after 90 days.

```bash
# Create lifecycle rules based on analysis findings
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-data-bucket \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "OptimizeLogStorage",
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
            "StorageClass": "GLACIER_IR"
          },
          {
            "Days": 365,
            "StorageClass": "DEEP_ARCHIVE"
          }
        ],
        "NoncurrentVersionTransitions": [
          {
            "NoncurrentDays": 7,
            "StorageClass": "STANDARD_IA"
          },
          {
            "NoncurrentDays": 30,
            "StorageClass": "DEEP_ARCHIVE"
          }
        ],
        "NoncurrentVersionExpiration": {
          "NoncurrentDays": 90
        }
      }
    ]
  }'
```

## S3 Intelligent-Tiering as an Alternative

If you don't want to manage lifecycle rules, S3 Intelligent-Tiering automatically moves objects between access tiers based on usage. It's a good fit when access patterns are unpredictable.

```bash
# Move existing objects to Intelligent-Tiering
# Use a lifecycle rule to transition
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-data-bucket \
  --lifecycle-configuration '{
    "Rules": [
      {
        "ID": "MoveToIntelligentTiering",
        "Status": "Enabled",
        "Filter": {
          "Prefix": "data/"
        },
        "Transitions": [
          {
            "Days": 0,
            "StorageClass": "INTELLIGENT_TIERING"
          }
        ]
      }
    ]
  }'
```

Configure Intelligent-Tiering archive tiers.

```bash
# Enable archive access tiers in Intelligent-Tiering
aws s3api put-bucket-intelligent-tiering-configuration \
  --bucket my-data-bucket \
  --id archive-config \
  --intelligent-tiering-configuration '{
    "Id": "archive-config",
    "Status": "Enabled",
    "Filter": {},
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

With this configuration, Intelligent-Tiering will automatically move objects to increasingly cheaper tiers as they age without access, and instantly move them back to frequent access when accessed.

## Using S3 Storage Lens for Broader Analysis

Storage Lens provides a wider view of your S3 usage across accounts, regions, and buckets.

```bash
# Create a Storage Lens dashboard
aws s3control put-storage-lens-configuration \
  --account-id 123456789012 \
  --config-id cost-optimization \
  --storage-lens-configuration '{
    "Id": "cost-optimization",
    "IsEnabled": true,
    "AccountLevel": {
      "BucketLevel": {
        "ActivityMetrics": { "IsEnabled": true },
        "AdvancedCostOptimizationMetrics": { "IsEnabled": true },
        "AdvancedDataProtectionMetrics": { "IsEnabled": true },
        "DetailedStatusCodesMetrics": { "IsEnabled": true }
      }
    }
  }'
```

The advanced cost optimization metrics show you things like the percentage of bytes in non-current versions, incomplete multipart uploads eating storage, and the ratio of Standard to IA storage.

## Calculating Potential Savings

Here's a Python script that estimates savings based on your current storage distribution.

```python
import boto3

def estimate_savings(bucket_name):
    """
    Estimate potential savings by analyzing storage class distribution.
    """
    s3 = boto3.client('s3')
    cloudwatch = boto3.client('cloudwatch')

    # Pricing per GB per month (approximate us-east-1 prices)
    pricing = {
        'StandardStorage': 0.023,
        'StandardIAStorage': 0.0125,
        'OneZoneIAStorage': 0.01,
        'GlacierInstantRetrievalStorage': 0.004,
        'GlacierStorage': 0.0036,
        'DeepArchiveStorage': 0.00099,
    }

    storage_types = [
        'StandardStorage',
        'StandardIAStorage',
        'OneZoneIAStorage',
        'GlacierInstantRetrievalStorage',
        'GlacierStorage',
        'DeepArchiveStorage',
    ]

    total_standard_gb = 0

    for storage_type in storage_types:
        try:
            response = cloudwatch.get_metric_statistics(
                Namespace='AWS/S3',
                MetricName='BucketSizeBytes',
                Dimensions=[
                    {'Name': 'BucketName', 'Value': bucket_name},
                    {'Name': 'StorageType', 'Value': storage_type},
                ],
                StartTime='2026-02-11T00:00:00Z',
                EndTime='2026-02-12T00:00:00Z',
                Period=86400,
                Statistics=['Average'],
            )

            if response['Datapoints']:
                size_gb = response['Datapoints'][0]['Average'] / (1024 ** 3)
                cost = size_gb * pricing.get(storage_type, 0)
                print(f"{storage_type}: {size_gb:.2f} GB = ${cost:.2f}/month")

                if storage_type == 'StandardStorage':
                    total_standard_gb = size_gb
        except Exception as e:
            print(f"Error getting {storage_type}: {e}")

    # Estimate savings if 60% of Standard moves to IA
    if total_standard_gb > 0:
        moveable = total_standard_gb * 0.6  # Assume 60% is infrequently accessed
        current_cost = moveable * pricing['StandardStorage']
        ia_cost = moveable * pricing['StandardIAStorage']
        savings = current_cost - ia_cost
        print(f"\nEstimated monthly savings if 60% moves to IA: ${savings:.2f}")


estimate_savings('my-data-bucket')
```

## Best Practices

1. **Run analysis for at least 30 days** before making changes
2. **Start with the biggest buckets** for maximum cost impact
3. **Consider retrieval costs** - if data is accessed occasionally, IA retrieval fees might offset storage savings
4. **Set minimum object size** - IA has a 128 KB minimum charge, so tiny objects don't benefit
5. **Monitor after transitions** - Watch for increased retrieval costs that might indicate you transitioned too aggressively

For tagging objects to track costs by department or project, see our guide on [S3 object tagging for organization and billing](https://oneuptime.com/blog/post/s3-object-tagging-organization-billing/view).

Track your S3 costs and savings trends over time with [OneUptime](https://oneuptime.com) to make sure your optimization efforts are paying off.
