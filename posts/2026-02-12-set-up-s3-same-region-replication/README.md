# How to Set Up S3 Same-Region Replication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, S3, Storage, Disaster Recovery

Description: Configure S3 Same-Region Replication to automatically copy objects between buckets in the same region for compliance, backup, or access control purposes.

---

S3 Same-Region Replication (SRR) automatically copies objects from one bucket to another bucket in the same AWS region. It's useful for a surprising number of scenarios: maintaining a production and backup copy in separate accounts, aggregating logs from multiple source buckets, replicating data between environments, or meeting compliance requirements that mandate data copies.

SRR works in real-time - objects are typically replicated within seconds. Let's set it up.

## Prerequisites

Before configuring replication, you need:

1. **Versioning enabled** on both source and destination buckets
2. **An IAM role** that grants S3 permission to replicate objects
3. **Both buckets in the same region** (for same-region replication)

## Step 1: Create the Destination Bucket

If you don't already have a destination bucket, create one.

Create the destination bucket with versioning enabled:

```bash
# Create the destination bucket
aws s3api create-bucket \
    --bucket my-bucket-replica \
    --region us-east-1

# Enable versioning on the destination (required for replication)
aws s3api put-bucket-versioning \
    --bucket my-bucket-replica \
    --versioning-configuration Status=Enabled
```

## Step 2: Enable Versioning on the Source

If versioning isn't already enabled on your source bucket:

```bash
# Enable versioning on the source bucket
aws s3api put-bucket-versioning \
    --bucket my-bucket-source \
    --versioning-configuration Status=Enabled
```

## Step 3: Create the IAM Role

S3 needs an IAM role with permission to read from the source bucket and write to the destination bucket.

Create the replication IAM role and policy:

```bash
# Create the trust policy for S3
cat > s3-replication-trust.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "s3.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

# Create the IAM role
aws iam create-role \
    --role-name s3-replication-role \
    --assume-role-policy-document file://s3-replication-trust.json

# Create the permissions policy
cat > s3-replication-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetReplicationConfiguration",
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::my-bucket-source"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObjectVersionForReplication",
                "s3:GetObjectVersionAcl",
                "s3:GetObjectVersionTagging"
            ],
            "Resource": "arn:aws:s3:::my-bucket-source/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ReplicateObject",
                "s3:ReplicateDelete",
                "s3:ReplicateTags"
            ],
            "Resource": "arn:aws:s3:::my-bucket-replica/*"
        }
    ]
}
EOF

# Attach the policy to the role
aws iam put-role-policy \
    --role-name s3-replication-role \
    --policy-name s3-replication-permissions \
    --policy-document file://s3-replication-policy.json
```

## Step 4: Configure Replication

Now set up the replication rule on the source bucket.

Create a replication configuration:

```bash
# Get the role ARN
ROLE_ARN=$(aws iam get-role --role-name s3-replication-role --query "Role.Arn" --output text)

# Create the replication configuration
cat > replication-config.json << EOF
{
    "Role": "$ROLE_ARN",
    "Rules": [
        {
            "ID": "replicate-all",
            "Status": "Enabled",
            "Priority": 1,
            "Filter": {},
            "Destination": {
                "Bucket": "arn:aws:s3:::my-bucket-replica",
                "StorageClass": "STANDARD"
            },
            "DeleteMarkerReplication": {
                "Status": "Enabled"
            }
        }
    ]
}
EOF

# Apply the replication configuration
aws s3api put-bucket-replication \
    --bucket my-bucket-source \
    --replication-configuration file://replication-config.json
```

## Step 5: Verify Replication

Test that replication is working:

```bash
# Upload a test object to the source
echo "replication test" > /tmp/test-replication.txt
aws s3 cp /tmp/test-replication.txt s3://my-bucket-source/test-replication.txt

# Wait a few seconds, then check the destination
sleep 5
aws s3 ls s3://my-bucket-replica/test-replication.txt

# Check the replication status on the source object
aws s3api head-object \
    --bucket my-bucket-source \
    --key test-replication.txt \
    --query "ReplicationStatus"
```

The replication status will be one of:
- **PENDING** - Replication is in progress
- **COMPLETED** - Successfully replicated
- **FAILED** - Replication failed (check IAM permissions)
- **REPLICA** - This object is itself a replica

## Replicating to a Different Storage Class

You can save money by replicating to a cheaper storage class in the destination.

Replicate to a different storage class:

```bash
cat > replication-config.json << EOF
{
    "Role": "$ROLE_ARN",
    "Rules": [
        {
            "ID": "replicate-to-ia",
            "Status": "Enabled",
            "Priority": 1,
            "Filter": {},
            "Destination": {
                "Bucket": "arn:aws:s3:::my-bucket-replica",
                "StorageClass": "STANDARD_IA"
            },
            "DeleteMarkerReplication": {
                "Status": "Enabled"
            }
        }
    ]
}
EOF

aws s3api put-bucket-replication \
    --bucket my-bucket-source \
    --replication-configuration file://replication-config.json
```

## Replicating with Filters

You don't have to replicate everything. Use filters to replicate only specific objects. For more on advanced filtering, see our guide on [replication rules with filters and prefixes](https://oneuptime.com/blog/post/2026-02-12-s3-replication-rules-filters-prefixes/view).

Replicate only objects matching a prefix:

```bash
cat > replication-config.json << EOF
{
    "Role": "$ROLE_ARN",
    "Rules": [
        {
            "ID": "replicate-important-data",
            "Status": "Enabled",
            "Priority": 1,
            "Filter": {
                "Prefix": "critical-data/"
            },
            "Destination": {
                "Bucket": "arn:aws:s3:::my-bucket-replica"
            },
            "DeleteMarkerReplication": {
                "Status": "Enabled"
            }
        }
    ]
}
EOF

aws s3api put-bucket-replication \
    --bucket my-bucket-source \
    --replication-configuration file://replication-config.json
```

## Cross-Account Replication

For cross-account SRR, you need additional bucket policy on the destination.

Add a bucket policy on the destination for cross-account replication:

```bash
# On the destination account's bucket, add a policy allowing replication
cat > dest-policy.json << 'EOF'
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowReplication",
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::SOURCE_ACCOUNT_ID:role/s3-replication-role"
            },
            "Action": [
                "s3:ReplicateObject",
                "s3:ReplicateDelete",
                "s3:ReplicateTags",
                "s3:ObjectOwnerOverrideToBucketOwner"
            ],
            "Resource": "arn:aws:s3:::my-bucket-replica/*"
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket my-bucket-replica --policy file://dest-policy.json
```

For cross-account, also add ownership override in the replication config:

```bash
# In the replication rule destination, add AccessControlTranslation
# This makes the destination account own the replicated objects
"Destination": {
    "Bucket": "arn:aws:s3:::my-bucket-replica",
    "Account": "DESTINATION_ACCOUNT_ID",
    "AccessControlTranslation": {
        "Owner": "Destination"
    }
}
```

## Replicating Existing Objects

By default, replication only applies to new objects uploaded after the rule is created. To replicate existing objects, use S3 Batch Replication.

Set up batch replication for existing objects:

```bash
# Create a batch replication job
aws s3control create-job \
    --account-id $(aws sts get-caller-identity --query Account --output text) \
    --operation '{"S3ReplicateObject":{}}' \
    --manifest-generator '{
        "S3JobManifestGenerator": {
            "SourceS3BucketArn": "arn:aws:s3:::my-bucket-source",
            "EnableManifestOutput": true,
            "ManifestOutputLocation": {
                "Bucket": "arn:aws:s3:::my-bucket-source",
                "ManifestPrefix": "batch-replication-manifest/"
            },
            "Filter": {
                "EligibleForReplication": true,
                "ObjectReplicationStatuses": ["NONE", "FAILED"]
            }
        }
    }' \
    --report '{
        "Bucket": "arn:aws:s3:::my-bucket-source",
        "Prefix": "batch-replication-report/",
        "Format": "Report_CSV_20180820",
        "Enabled": true,
        "ReportScope": "AllTasks"
    }' \
    --priority 1 \
    --role-arn "$ROLE_ARN" \
    --confirmation-required
```

## Monitoring Replication

Keep track of replication performance and failures:

```bash
# Check replication metrics
aws cloudwatch get-metric-statistics \
    --namespace AWS/S3 \
    --metric-name OperationsPendingReplication \
    --dimensions Name=SourceBucket,Value=my-bucket-source \
                Name=DestinationBucket,Value=my-bucket-replica \
                Name=RuleId,Value=replicate-all \
    --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 300 \
    --statistics Average

# Enable S3 Replication Time Control (RTC) for SLA-backed replication
# This guarantees 99.99% of objects replicate within 15 minutes
```

## Common Use Cases for Same-Region Replication

1. **Backup to a separate account** - Protect against accidental deletion or account compromise
2. **Log aggregation** - Replicate logs from multiple source buckets to a central analytics bucket
3. **Test/staging environments** - Keep a copy of production data in a dev bucket
4. **Compliance** - Maintain an immutable copy of data for regulatory requirements
5. **Access control separation** - Different teams access different replicas with different permissions

SRR is a powerful feature that runs silently in the background once configured. Set it up, verify it's working, and you've got an automatic, real-time backup that requires zero ongoing maintenance.
