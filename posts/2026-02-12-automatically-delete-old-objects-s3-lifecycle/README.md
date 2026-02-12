# How to Automatically Delete Old Objects with S3 Lifecycle Policies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Storage, Cost Optimization

Description: Configure S3 lifecycle policies to automatically expire and delete old objects, clean up incomplete uploads, and manage versioned object retention.

---

S3 buckets have a tendency to grow forever if you don't manage them. Logs pile up, old backups accumulate, temporary files never get cleaned, and before you know it you're paying hundreds of dollars a month for data nobody will ever look at again. S3 lifecycle expiration policies solve this by automatically deleting objects after a specified number of days.

Let's set up expiration policies for the most common scenarios.

## Basic Expiration: Delete Objects After N Days

The simplest lifecycle rule deletes objects after they reach a certain age.

Delete all objects after 90 days:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-log-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "delete-after-90-days",
                "Status": "Enabled",
                "Filter": {},
                "Expiration": {
                    "Days": 90
                }
            }
        ]
    }'
```

After this rule takes effect, S3 will automatically delete objects that are older than 90 days. The deletion happens asynchronously - there might be a delay of a day or two after an object becomes eligible.

## Expiration by Prefix

Target specific paths within your bucket for different retention periods.

Set different retention periods for different prefixes:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "delete-temp-files-7d",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "temp/"
                },
                "Expiration": {
                    "Days": 7
                }
            },
            {
                "ID": "delete-logs-30d",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "logs/"
                },
                "Expiration": {
                    "Days": 30
                }
            },
            {
                "ID": "delete-backups-365d",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "backups/"
                },
                "Expiration": {
                    "Days": 365
                }
            }
        ]
    }'
```

This keeps temp files for a week, logs for a month, and backups for a year.

## Expiration by Tags

Tags give you more granular control over which objects get deleted.

Expire objects based on their tags:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "delete-ephemeral-data",
                "Status": "Enabled",
                "Filter": {
                    "Tag": {
                        "Key": "lifecycle",
                        "Value": "ephemeral"
                    }
                },
                "Expiration": {
                    "Days": 3
                }
            },
            {
                "ID": "delete-quarterly-reports",
                "Status": "Enabled",
                "Filter": {
                    "And": {
                        "Prefix": "reports/",
                        "Tags": [
                            {
                                "Key": "type",
                                "Value": "quarterly"
                            }
                        ]
                    }
                },
                "Expiration": {
                    "Days": 730
                }
            }
        ]
    }'
```

To use tag-based expiration, tag your objects when you upload them:

```bash
# Upload with a lifecycle tag
aws s3 cp temp-data.json s3://my-bucket/temp/data.json \
    --tagging "lifecycle=ephemeral"
```

## Handling Versioned Buckets

Versioned buckets need special attention because "deleting" an object just creates a delete marker. You need separate rules for current versions, non-current versions, and delete markers.

Set up comprehensive expiration for versioned buckets:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-versioned-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "expire-current-objects",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "logs/"
                },
                "Expiration": {
                    "Days": 30
                }
            },
            {
                "ID": "expire-noncurrent-versions",
                "Status": "Enabled",
                "Filter": {},
                "NoncurrentVersionExpiration": {
                    "NoncurrentDays": 90,
                    "NewerNoncurrentVersions": 3
                }
            },
            {
                "ID": "cleanup-delete-markers",
                "Status": "Enabled",
                "Filter": {},
                "Expiration": {
                    "ExpiredObjectDeleteMarker": true
                }
            }
        ]
    }'
```

Breaking this down:
- **expire-current-objects**: Creates delete markers for logs/ objects after 30 days
- **expire-noncurrent-versions**: Permanently deletes non-current versions after 90 days, keeping the 3 most recent
- **cleanup-delete-markers**: Removes orphaned delete markers (where all versions have been deleted)

The `NewerNoncurrentVersions` parameter is key for versioned buckets. It ensures you always have a few recent versions available for [recovery](https://oneuptime.com/blog/post/recover-deleted-objects-versioned-s3-bucket/view) while still cleaning up the old ones.

## Cleaning Up Incomplete Multipart Uploads

This is one of the most overlooked sources of wasted S3 storage. Incomplete multipart uploads sit there consuming space and costing money indefinitely.

Abort incomplete multipart uploads:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "abort-incomplete-uploads",
                "Status": "Enabled",
                "Filter": {},
                "AbortIncompleteMultipartUpload": {
                    "DaysAfterInitiation": 7
                }
            }
        ]
    }'
```

Every bucket should have this rule. There's no good reason to keep incomplete multipart uploads around for more than a few days. If an upload hasn't completed in 7 days, it's almost certainly abandoned.

Check how much storage incomplete uploads are consuming:

```bash
# List all incomplete multipart uploads
aws s3api list-multipart-uploads \
    --bucket my-bucket \
    --query "Uploads[*].[Key,Initiated,UploadId]" \
    --output table
```

## Combining Transitions and Expirations

The most cost-effective approach combines [storage class transitions](https://oneuptime.com/blog/post/s3-lifecycle-rules-transition-storage-classes/view) with eventual expiration.

Create a complete lifecycle with transitions and expiration:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "complete-lifecycle-for-logs",
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
                        "Days": 60,
                        "StorageClass": "GLACIER_IR"
                    }
                ],
                "Expiration": {
                    "Days": 180
                }
            },
            {
                "ID": "complete-lifecycle-for-backups",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "backups/"
                },
                "Transitions": [
                    {
                        "Days": 14,
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
                    "Days": 2555
                }
            },
            {
                "ID": "cleanup-multipart",
                "Status": "Enabled",
                "Filter": {},
                "AbortIncompleteMultipartUpload": {
                    "DaysAfterInitiation": 7
                }
            }
        ]
    }'
```

This configuration keeps logs for 6 months (transitioning to cheaper storage along the way) and keeps backups for 7 years (in increasingly cheaper storage classes).

## Expiration on a Specific Date

You can expire objects on a specific date instead of after N days.

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "expire-on-date",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "event-data/2025-conference/"
                },
                "Expiration": {
                    "Date": "2026-06-01T00:00:00Z"
                }
            }
        ]
    }'
```

## Monitoring Lifecycle Rule Execution

Lifecycle rules run asynchronously and don't provide direct execution logs. But you can monitor their effect.

Track lifecycle rule activity:

```bash
# Monitor storage changes over time with S3 Storage Lens
# Or use CloudWatch metrics

# Check current storage by class
aws s3api list-objects-v2 \
    --bucket my-bucket \
    --query "Contents[].StorageClass" \
    --output text | sort | uniq -c | sort -rn

# Monitor deletion activity via CloudTrail
# Look for DeleteObject events with requestParameters.lifecycle=true
```

## Common Mistakes

**Forgetting about versioned objects.** If versioning is on, expiration just creates delete markers. You need explicit NoncurrentVersionExpiration rules.

**Not cleaning up multipart uploads.** They're invisible in normal listings but still cost money. Always add an AbortIncompleteMultipartUpload rule.

**Transitioning tiny objects to IA.** Objects smaller than 128 KB get charged as 128 KB in IA storage classes. Filter by size or keep them in Standard.

**Setting rules too aggressive.** Start conservative. You can always shorten retention periods, but you can't recover expired objects (unless you have versioning and the non-current version hasn't been expired yet).

**Overlapping rules.** If two rules apply to the same object, S3 applies the most conservative action. But this can lead to confusing behavior. Keep your rules non-overlapping when possible.

## Estimating Cost Savings

Quick math for a typical scenario:

```
Current state: 5 TB in Standard = $117.50/month

With lifecycle rules:
- 1 TB (0-30 days) in Standard: $23.50
- 1.5 TB (30-90 days) in IA: $19.20
- 1.5 TB (90-180 days) in Glacier IR: $6.14
- 1 TB expired (deleted): $0

Monthly cost: $48.84 (58% savings)
Annual savings: $823.92
```

The savings compound as your bucket grows. A bucket generating 500 GB of new data per month would save thousands annually with proper lifecycle rules.

Lifecycle policies are set-and-forget cost optimization. Take 15 minutes to configure them on every bucket, and you'll stop bleeding money on data that's just sitting there aging.
