# How to Set Up S3 Lifecycle Rules to Transition Objects Between Storage Classes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Storage, Cost Optimization

Description: Configure S3 lifecycle rules to automatically move objects between storage classes based on access patterns, saving money without manual intervention.

---

S3 offers seven storage classes, ranging from Standard (fast, expensive) to Glacier Deep Archive (slow retrieval, very cheap). Most objects follow a predictable pattern: they're accessed frequently when new, then less and less over time. Lifecycle rules let you automatically move objects between storage classes based on age, so you're always paying the right price for the right access pattern.

Without lifecycle rules, you're either overpaying (keeping everything in Standard) or manually managing transitions (which nobody actually keeps up with). Let's set up lifecycle rules that handle this automatically.

## Understanding S3 Storage Classes

Before writing rules, you need to know what's available.

| Storage Class | Use Case | Retrieval Time | Cost (per GB/month) |
|--------------|----------|----------------|-------------------|
| Standard | Frequently accessed | Milliseconds | ~$0.023 |
| Intelligent-Tiering | Unknown access patterns | Milliseconds | ~$0.023 + monitoring fee |
| Standard-IA | Infrequent access (30+ days) | Milliseconds | ~$0.0125 |
| One Zone-IA | Non-critical infrequent data | Milliseconds | ~$0.010 |
| Glacier Instant Retrieval | Archive with instant access | Milliseconds | ~$0.004 |
| Glacier Flexible Retrieval | Archive with hours retrieval | Minutes to hours | ~$0.0036 |
| Glacier Deep Archive | Long-term archive | 12-48 hours | ~$0.00099 |

The transition waterfall goes from top to bottom. You can't move objects "up" the chain with lifecycle rules - only down.

## Creating a Basic Lifecycle Rule

Let's start with a common pattern: move objects to IA after 30 days, then to Glacier after 90 days.

Create a lifecycle rule for gradual storage transitions:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "transition-to-cheaper-storage",
                "Status": "Enabled",
                "Filter": {},
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
                        "Days": 180,
                        "StorageClass": "GLACIER"
                    },
                    {
                        "Days": 365,
                        "StorageClass": "DEEP_ARCHIVE"
                    }
                ]
            }
        ]
    }'
```

This rule creates a four-stage transition:
- Days 0-29: Standard (frequently accessed)
- Days 30-89: Standard-IA (saves about 45%)
- Days 90-179: Glacier Instant Retrieval (saves about 82%)
- Days 180-364: Glacier Flexible Retrieval (saves about 84%)
- Day 365+: Deep Archive (saves about 96%)

## Filtering by Prefix

Apply rules only to specific paths in your bucket.

Create transition rules for specific prefixes:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "archive-logs",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "logs/"
                },
                "Transitions": [
                    {
                        "Days": 7,
                        "StorageClass": "STANDARD_IA"
                    },
                    {
                        "Days": 30,
                        "StorageClass": "GLACIER"
                    }
                ]
            },
            {
                "ID": "archive-backups",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "backups/"
                },
                "Transitions": [
                    {
                        "Days": 14,
                        "StorageClass": "GLACIER_IR"
                    },
                    {
                        "Days": 90,
                        "StorageClass": "DEEP_ARCHIVE"
                    }
                ]
            },
            {
                "ID": "keep-data-standard",
                "Status": "Enabled",
                "Filter": {
                    "Prefix": "active-data/"
                },
                "Transitions": [
                    {
                        "Days": 60,
                        "StorageClass": "INTELLIGENT_TIERING"
                    }
                ]
            }
        ]
    }'
```

## Filtering by Tags

You can also filter by object tags, which gives you more flexibility than prefix-based rules.

Create transition rules based on object tags:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "archive-tagged-objects",
                "Status": "Enabled",
                "Filter": {
                    "Tag": {
                        "Key": "retention",
                        "Value": "archive"
                    }
                },
                "Transitions": [
                    {
                        "Days": 0,
                        "StorageClass": "GLACIER_IR"
                    }
                ]
            },
            {
                "ID": "transition-temp-data",
                "Status": "Enabled",
                "Filter": {
                    "And": {
                        "Prefix": "temp/",
                        "Tags": [
                            {
                                "Key": "type",
                                "Value": "report"
                            }
                        ]
                    }
                },
                "Transitions": [
                    {
                        "Days": 30,
                        "StorageClass": "STANDARD_IA"
                    }
                ]
            }
        ]
    }'
```

## Handling Non-Current Versions

If your bucket has [versioning enabled](https://oneuptime.com/blog/post/2026-02-12-enable-s3-bucket-versioning/view), you'll want lifecycle rules for non-current versions too. These old versions can silently accumulate storage costs.

Transition non-current versions to cheaper storage:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "transition-current-versions",
                "Status": "Enabled",
                "Filter": {},
                "Transitions": [
                    {
                        "Days": 30,
                        "StorageClass": "STANDARD_IA"
                    }
                ]
            },
            {
                "ID": "transition-old-versions",
                "Status": "Enabled",
                "Filter": {},
                "NoncurrentVersionTransitions": [
                    {
                        "NoncurrentDays": 7,
                        "StorageClass": "STANDARD_IA"
                    },
                    {
                        "NoncurrentDays": 30,
                        "StorageClass": "GLACIER_IR"
                    },
                    {
                        "NoncurrentDays": 90,
                        "StorageClass": "DEEP_ARCHIVE"
                    }
                ],
                "NoncurrentVersionExpiration": {
                    "NoncurrentDays": 365,
                    "NewerNoncurrentVersions": 3
                }
            }
        ]
    }'
```

This keeps the 3 most recent non-current versions, transitions older ones through cheaper storage classes, and eventually deletes them after a year. For more on expiring old objects, see our guide on [automatically deleting old objects](https://oneuptime.com/blog/post/2026-02-12-automatically-delete-old-objects-s3-lifecycle/view).

## Viewing Current Lifecycle Configuration

Check what rules are currently active:

```bash
# View current lifecycle configuration
aws s3api get-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --output json

# Pretty print with jq
aws s3api get-bucket-lifecycle-configuration \
    --bucket my-bucket | python3 -m json.tool
```

## Transition Constraints

There are some rules about which transitions are allowed:

1. **Minimum object size for IA**: Objects smaller than 128 KB are charged as 128 KB in IA classes. Don't transition tiny files to IA.
2. **Minimum 30 days in Standard before IA**: You can transition to Standard-IA after a minimum of 30 days from creation.
3. **Minimum 30 days between IA and Glacier**: After transitioning to Standard-IA, you need at least 30 more days before moving to Glacier.
4. **One-way transitions**: You can only move down the storage class hierarchy, not back up.
5. **Per-request charges**: IA and Glacier classes charge per retrieval. If objects are accessed frequently, they can cost more in IA than Standard.

Filter out small objects from IA transitions:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "transition-large-objects-only",
                "Status": "Enabled",
                "Filter": {
                    "ObjectSizeGreaterThan": 131072
                },
                "Transitions": [
                    {
                        "Days": 30,
                        "StorageClass": "STANDARD_IA"
                    }
                ]
            }
        ]
    }'
```

The `ObjectSizeGreaterThan` filter (128 KB = 131,072 bytes) ensures you only transition objects large enough to benefit from the lower storage rate.

## Intelligent-Tiering as an Alternative

If you're not sure about access patterns, S3 Intelligent-Tiering automatically moves objects between tiers based on actual access.

Transition to Intelligent-Tiering for automatic optimization:

```bash
aws s3api put-bucket-lifecycle-configuration \
    --bucket my-bucket \
    --lifecycle-configuration '{
        "Rules": [
            {
                "ID": "use-intelligent-tiering",
                "Status": "Enabled",
                "Filter": {
                    "ObjectSizeGreaterThan": 131072
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

Intelligent-Tiering charges a small monitoring fee per object ($0.0025 per 1,000 objects) but automatically moves objects between Frequent Access, Infrequent Access, and Archive tiers. It's a great hands-off option when you can't predict access patterns.

## Estimating Savings

Rough math for estimating lifecycle rule savings:

```bash
# If you have 10 TB in Standard (~$235/month)
# And 80% hasn't been accessed in 30 days:
# 8 TB in Standard-IA: 8 * 1024 * $0.0125 = $102.40
# 2 TB in Standard: 2 * 1024 * $0.023 = $47.10
# Total: $149.50 vs $235 = 36% savings

# After 90 days, transition to Glacier IR:
# 6 TB in Glacier IR: 6 * 1024 * $0.004 = $24.58
# 2 TB in Standard-IA: 2 * 1024 * $0.0125 = $25.60
# 2 TB in Standard: 2 * 1024 * $0.023 = $47.10
# Total: $97.28 vs $235 = 59% savings
```

Lifecycle rules are one of the most impactful cost optimization tools in AWS. Set them up once and they keep saving you money month after month. Start conservative, monitor the results for a billing cycle, then adjust as needed.
