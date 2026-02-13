# How to Use S3 Replication Rules with Filters and Prefixes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Storage, Replication

Description: Master S3 replication rule filtering to selectively replicate objects based on prefixes, tags, and object size with practical configuration examples.

---

S3 replication doesn't have to be all-or-nothing. With replication rule filters, you can precisely control which objects get replicated based on their key prefix, tags, or size. This lets you set up targeted replication - like replicating only production data, only objects tagged for compliance, or only files above a certain size.

Let's explore all the filtering options and how to combine them effectively.

## Basic Prefix Filter

The most common filter. Replicate only objects whose keys start with a specific prefix.

Replicate only objects under a specific prefix:

```bash
ROLE_ARN="arn:aws:iam::123456789012:role/s3-replication-role"

aws s3api put-bucket-replication \
    --bucket my-source-bucket \
    --replication-configuration '{
        "Role": "'"$ROLE_ARN"'",
        "Rules": [
            {
                "ID": "replicate-production-data",
                "Status": "Enabled",
                "Priority": 1,
                "Filter": {
                    "Prefix": "production/"
                },
                "Destination": {
                    "Bucket": "arn:aws:s3:::my-replica-bucket"
                },
                "DeleteMarkerReplication": {
                    "Status": "Enabled"
                }
            }
        ]
    }'
```

Only objects with keys starting with `production/` will be replicated. Objects under `staging/` or `dev/` are ignored.

## Tag-Based Filtering

Filter replication based on object tags. This is more flexible than prefixes because you can tag objects regardless of their key structure.

Replicate objects with specific tags:

```bash
aws s3api put-bucket-replication \
    --bucket my-source-bucket \
    --replication-configuration '{
        "Role": "'"$ROLE_ARN"'",
        "Rules": [
            {
                "ID": "replicate-compliance-data",
                "Status": "Enabled",
                "Priority": 1,
                "Filter": {
                    "Tag": {
                        "Key": "compliance",
                        "Value": "required"
                    }
                },
                "Destination": {
                    "Bucket": "arn:aws:s3:::compliance-archive-bucket"
                },
                "DeleteMarkerReplication": {
                    "Status": "Enabled"
                }
            }
        ]
    }'
```

Now when you upload objects, tag the ones that need replication:

```bash
# This object will be replicated
aws s3 cp report.pdf s3://my-source-bucket/reports/annual-report.pdf \
    --tagging "compliance=required"

# This object will NOT be replicated (no matching tag)
aws s3 cp notes.txt s3://my-source-bucket/reports/meeting-notes.txt
```

## Combining Prefix and Tag Filters

When you need both a prefix and a tag condition, use the `And` operator.

Replicate objects matching both prefix and tag:

```bash
aws s3api put-bucket-replication \
    --bucket my-source-bucket \
    --replication-configuration '{
        "Role": "'"$ROLE_ARN"'",
        "Rules": [
            {
                "ID": "replicate-critical-finance-data",
                "Status": "Enabled",
                "Priority": 1,
                "Filter": {
                    "And": {
                        "Prefix": "finance/",
                        "Tags": [
                            {
                                "Key": "data-class",
                                "Value": "critical"
                            }
                        ]
                    }
                },
                "Destination": {
                    "Bucket": "arn:aws:s3:::finance-backup-bucket"
                },
                "DeleteMarkerReplication": {
                    "Status": "Enabled"
                }
            }
        ]
    }'
```

This only replicates objects that are both under the `finance/` prefix AND tagged with `data-class=critical`.

## Multiple Tag Filters

You can require multiple tags to match.

Replicate objects matching multiple tags:

```bash
aws s3api put-bucket-replication \
    --bucket my-source-bucket \
    --replication-configuration '{
        "Role": "'"$ROLE_ARN"'",
        "Rules": [
            {
                "ID": "replicate-approved-sensitive-data",
                "Status": "Enabled",
                "Priority": 1,
                "Filter": {
                    "And": {
                        "Tags": [
                            {
                                "Key": "sensitivity",
                                "Value": "high"
                            },
                            {
                                "Key": "approved-for-replication",
                                "Value": "yes"
                            }
                        ]
                    }
                },
                "Destination": {
                    "Bucket": "arn:aws:s3:::secure-backup-bucket"
                },
                "DeleteMarkerReplication": {
                    "Status": "Enabled"
                }
            }
        ]
    }'
```

Both tags must be present on an object for it to be replicated. This is an AND condition - there's no native OR filter for tags.

## Multiple Rules with Different Destinations

You can have multiple replication rules routing different objects to different buckets.

Route objects to different destination buckets based on prefix:

```bash
aws s3api put-bucket-replication \
    --bucket my-source-bucket \
    --replication-configuration '{
        "Role": "'"$ROLE_ARN"'",
        "Rules": [
            {
                "ID": "replicate-logs-to-analytics",
                "Status": "Enabled",
                "Priority": 1,
                "Filter": {
                    "Prefix": "logs/"
                },
                "Destination": {
                    "Bucket": "arn:aws:s3:::analytics-bucket",
                    "StorageClass": "STANDARD_IA"
                },
                "DeleteMarkerReplication": {
                    "Status": "Disabled"
                }
            },
            {
                "ID": "replicate-backups-to-archive",
                "Status": "Enabled",
                "Priority": 2,
                "Filter": {
                    "Prefix": "backups/"
                },
                "Destination": {
                    "Bucket": "arn:aws:s3:::archive-bucket",
                    "StorageClass": "GLACIER"
                },
                "DeleteMarkerReplication": {
                    "Status": "Enabled"
                }
            },
            {
                "ID": "replicate-data-to-dr",
                "Status": "Enabled",
                "Priority": 3,
                "Filter": {
                    "Prefix": "data/"
                },
                "Destination": {
                    "Bucket": "arn:aws:s3:::dr-bucket"
                },
                "DeleteMarkerReplication": {
                    "Status": "Enabled"
                }
            }
        ]
    }'
```

Each rule has a unique priority. When an object matches multiple rules, the rule with the highest priority (lowest number) wins.

## Rule Priority

Priority matters when rules overlap. Consider this scenario:

```bash
# Rule 1 (Priority 1): Prefix "data/" -> bucket-a
# Rule 2 (Priority 2): Prefix "data/reports/" -> bucket-b
```

An object at `data/reports/q1.pdf` matches both rules. It will be replicated to `bucket-a` because Rule 1 has higher priority (lower number).

If you want `data/reports/` to go to bucket-b and everything else under `data/` to bucket-a, set bucket-b as priority 1:

```bash
# Rule 1 (Priority 1): Prefix "data/reports/" -> bucket-b  (checked first)
# Rule 2 (Priority 2): Prefix "data/" -> bucket-a  (fallback)
```

## Replicating Only Large Files

You can filter by object size to replicate only objects above or below a certain size.

Replicate only objects larger than 1 MB:

```bash
aws s3api put-bucket-replication \
    --bucket my-source-bucket \
    --replication-configuration '{
        "Role": "'"$ROLE_ARN"'",
        "Rules": [
            {
                "ID": "replicate-large-objects",
                "Status": "Enabled",
                "Priority": 1,
                "Filter": {
                    "And": {
                        "Prefix": "",
                        "ObjectSizeGreaterThan": 1048576
                    }
                },
                "Destination": {
                    "Bucket": "arn:aws:s3:::large-files-backup"
                },
                "DeleteMarkerReplication": {
                    "Status": "Enabled"
                }
            }
        ]
    }'
```

You can also use `ObjectSizeLessThan` to replicate only small objects, or combine both for a size range.

## Controlling Delete Marker Replication

Each rule can independently control whether delete markers are replicated.

```bash
# With DeleteMarkerReplication enabled:
# - Deleting an object in source creates a delete marker
# - The delete marker is replicated to destination
# - The object appears deleted in both buckets

# With DeleteMarkerReplication disabled:
# - Deleting an object in source creates a delete marker
# - The delete marker is NOT replicated
# - The object appears deleted in source but still visible in destination
```

Disabling delete marker replication is useful when the destination serves as an archive that should never have objects deleted.

## Viewing and Managing Replication Rules

Check and manage your replication configuration:

```bash
# View current replication configuration
aws s3api get-bucket-replication \
    --bucket my-source-bucket \
    --output json | python3 -m json.tool

# Disable a specific rule without removing it
# (Get the config, change the rule's Status to "Disabled", re-apply)

# Remove all replication rules
aws s3api delete-bucket-replication \
    --bucket my-source-bucket
```

## Monitoring Filtered Replication

Check which objects are being replicated:

```bash
# Check replication status of a specific object
aws s3api head-object \
    --bucket my-source-bucket \
    --key production/data.csv \
    --query "ReplicationStatus"

# List objects with failed replication
aws s3api list-objects-v2 \
    --bucket my-source-bucket \
    --prefix production/ \
    --query "Contents[].Key" | while read KEY; do
    STATUS=$(aws s3api head-object \
        --bucket my-source-bucket \
        --key "$KEY" \
        --query "ReplicationStatus" --output text 2>/dev/null)
    if [ "$STATUS" = "FAILED" ]; then
        echo "FAILED: $KEY"
    fi
done
```

## Best Practices

1. **Use specific prefixes** rather than replicating everything. It reduces replication traffic and costs.
2. **Tag objects for flexible filtering** when prefix-based rules aren't granular enough.
3. **Set appropriate priorities** to avoid unexpected behavior with overlapping rules.
4. **Test with a small prefix first** before rolling out to your entire bucket.
5. **Monitor replication status** to catch failures early.
6. **Consider destination storage class** - replicate to IA or Glacier for backups to save on storage costs.

For a complete guide on setting up the replication infrastructure, see our [S3 Same-Region Replication guide](https://oneuptime.com/blog/post/2026-02-12-set-up-s3-same-region-replication/view). For versioning setup (a prerequisite for replication), check [enabling S3 bucket versioning](https://oneuptime.com/blog/post/2026-02-12-enable-s3-bucket-versioning/view).
