# How to Copy an AMI to Another AWS Region

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, AMI, Multi-Region, Disaster Recovery

Description: Learn how to copy Amazon Machine Images across AWS regions for disaster recovery, multi-region deployments, and latency optimization strategies.

---

AMIs are regional resources. An AMI in us-east-1 can only be used to launch instances in us-east-1. If you need to launch instances in another region - for disaster recovery, to serve users in different geographies, or to migrate workloads - you need to copy the AMI there first.

The copy process is straightforward, but there are nuances around encryption, permissions, and automation that are worth understanding.

## Copying an AMI via the Console

1. Go to EC2 > AMIs in the source region
2. Select the AMI you want to copy
3. Click "Actions" > "Copy AMI"
4. In the dialog:
   - Select the destination region
   - Give the copy a name (the original name is pre-filled)
   - Optionally add a description
   - Choose encryption settings for the destination
5. Click "Copy AMI"

The copy starts immediately. You'll get a new AMI ID in the destination region. The AMI won't be available until all the underlying EBS snapshots finish copying, which can take anywhere from a few minutes to several hours depending on volume size.

## Copying via the CLI

```bash
# Copy an AMI from us-east-1 to eu-west-1
aws ec2 copy-image \
    --source-image-id ami-0123456789abcdef0 \
    --source-region us-east-1 \
    --region eu-west-1 \
    --name "webapp-v2.1-eu-copy" \
    --description "Copy of webapp AMI for EU deployment"
```

The command returns the new AMI ID in the destination region:

```json
{
    "ImageId": "ami-eu-0987654321fedcba0"
}
```

Wait for it to become available before using it:

```bash
# Check the status of the copy in the destination region
aws ec2 describe-images \
    --region eu-west-1 \
    --image-ids ami-eu-0987654321fedcba0 \
    --query 'Images[0].State'

# Wait for it to be ready
aws ec2 wait image-available \
    --region eu-west-1 \
    --image-ids ami-eu-0987654321fedcba0
```

## Encryption During Copy

You can encrypt the AMI during the copy process, even if the source AMI is unencrypted. This is actually a common pattern for adding encryption to existing AMIs:

```bash
# Copy and encrypt with the default EBS encryption key
aws ec2 copy-image \
    --source-image-id ami-0123456789abcdef0 \
    --source-region us-east-1 \
    --region eu-west-1 \
    --name "webapp-v2.1-eu-encrypted" \
    --encrypted

# Copy and encrypt with a specific KMS key
aws ec2 copy-image \
    --source-image-id ami-0123456789abcdef0 \
    --source-region us-east-1 \
    --region eu-west-1 \
    --name "webapp-v2.1-eu-encrypted" \
    --encrypted \
    --kms-key-id arn:aws:kms:eu-west-1:123456789012:key/mrk-abc123
```

If the source AMI is encrypted with a customer-managed KMS key, you need permission to use that key for the copy to work. The destination can use a different KMS key.

## Copying Shared AMIs

If someone shared an AMI with you, you can copy it to any region in your own account:

```bash
# Copy a shared AMI to your account in another region
aws ec2 copy-image \
    --source-image-id ami-shared-0123456789 \
    --source-region us-east-1 \
    --region us-west-2 \
    --name "shared-webapp-us-west-2-copy"
```

Once copied, the new AMI belongs to your account. You have full control over it, regardless of what the original owner does with their AMI. This is a good practice for any shared AMI you depend on - see our guide on [sharing AMIs across accounts](https://oneuptime.com/blog/post/share-ami-across-aws-accounts/view) for more details.

## Multi-Region Deployment Strategy

For applications that need to run in multiple regions, you'll want to automate AMI distribution. Here's a practical script:

```bash
#!/bin/bash
# Distribute an AMI to multiple regions

SOURCE_REGION="us-east-1"
SOURCE_AMI="ami-0123456789abcdef0"
AMI_NAME="webapp-v2.1"
TARGET_REGIONS=("eu-west-1" "ap-southeast-1" "us-west-2")

# Get the source AMI name if not provided
if [ -z "$AMI_NAME" ]; then
    AMI_NAME=$(aws ec2 describe-images \
        --region $SOURCE_REGION \
        --image-ids $SOURCE_AMI \
        --query 'Images[0].Name' \
        --output text)
fi

# Copy to each target region in parallel
for REGION in "${TARGET_REGIONS[@]}"; do
    echo "Copying $SOURCE_AMI to $REGION..."

    NEW_AMI=$(aws ec2 copy-image \
        --source-image-id $SOURCE_AMI \
        --source-region $SOURCE_REGION \
        --region $REGION \
        --name "${AMI_NAME}-${REGION}" \
        --description "Multi-region copy from $SOURCE_REGION" \
        --output text)

    echo "  Created $NEW_AMI in $REGION"

    # Tag the new AMI
    aws ec2 create-tags \
        --region $REGION \
        --resources $NEW_AMI \
        --tags Key=SourceAMI,Value=$SOURCE_AMI \
               Key=SourceRegion,Value=$SOURCE_REGION
done

echo "Copy jobs initiated. Check each region for completion."
```

## Monitoring Copy Progress

AMI copies can take a while for large volumes. Monitor progress with:

```bash
# Check progress of all pending AMIs in a region
aws ec2 describe-images \
    --region eu-west-1 \
    --owners self \
    --filters "Name=state,Values=pending" \
    --query 'Images[*].[ImageId,Name,State]' \
    --output table
```

For the underlying snapshot copy progress:

```bash
# Check snapshot copy progress (shows percentage)
aws ec2 describe-snapshots \
    --region eu-west-1 \
    --owner-ids self \
    --filters "Name=status,Values=pending" \
    --query 'Snapshots[*].[SnapshotId,Progress,VolumeSize]' \
    --output table
```

## Cost Considerations

AMI copies involve:

1. **Data transfer between regions** - Standard inter-region data transfer charges apply. This is roughly $0.02 per GB depending on the regions.
2. **Snapshot storage in the destination** - The same per-GB monthly cost as any EBS snapshot ($0.05/GB-month).
3. **No charge for the AMI metadata itself**.

For a 50 GB AMI copied to 3 regions, you're looking at about:
- Transfer: 50 GB x 3 regions x $0.02 = $3.00 (one-time)
- Storage: 50 GB x 3 regions x $0.05 = $7.50/month

Not huge numbers, but they add up if you're copying many AMIs frequently. Clean up AMIs you no longer need in destination regions.

## Disaster Recovery Pattern

A common DR pattern is to continuously replicate AMIs from your primary region to a DR region:

```bash
#!/bin/bash
# DR replication: copy latest AMIs tagged for DR to the backup region

PRIMARY_REGION="us-east-1"
DR_REGION="us-west-2"

# Find AMIs tagged for DR replication
DR_AMIS=$(aws ec2 describe-images \
    --region $PRIMARY_REGION \
    --owners self \
    --filters "Name=tag:DR,Values=true" \
    --query 'Images[*].[ImageId,Name]' \
    --output text)

while IFS=$'\t' read -r AMI_ID AMI_NAME; do
    # Check if this AMI already exists in the DR region (by name)
    EXISTS=$(aws ec2 describe-images \
        --region $DR_REGION \
        --owners self \
        --filters "Name=name,Values=${AMI_NAME}-dr" \
        --query 'Images[0].ImageId' \
        --output text)

    if [ "$EXISTS" = "None" ] || [ -z "$EXISTS" ]; then
        echo "Replicating $AMI_ID ($AMI_NAME) to $DR_REGION..."
        aws ec2 copy-image \
            --source-image-id $AMI_ID \
            --source-region $PRIMARY_REGION \
            --region $DR_REGION \
            --name "${AMI_NAME}-dr" \
            --encrypted
    else
        echo "AMI $AMI_NAME already exists in $DR_REGION, skipping."
    fi
done <<< "$DR_AMIS"
```

Run this on a schedule (daily or after each AMI build) to keep your DR region up to date.

## Tags Don't Copy Automatically

One gotcha: tags from the source AMI don't automatically copy to the destination. You need to tag the copy separately:

```bash
# Copy tags from source to destination AMI
SOURCE_TAGS=$(aws ec2 describe-images \
    --region us-east-1 \
    --image-ids ami-0123456789abcdef0 \
    --query 'Images[0].Tags' \
    --output json)

aws ec2 create-tags \
    --region eu-west-1 \
    --resources ami-eu-0987654321fedcba0 \
    --tags "$SOURCE_TAGS"
```

## Troubleshooting

**Copy stuck in "pending" for hours**: Large volumes take time. A 1 TB volume can take several hours. If it's been more than 24 hours, check AWS Health Dashboard for the destination region.

**"You do not have permission to access the source snapshot"**: The source AMI's snapshots may be encrypted with a KMS key you don't have access to. Check KMS permissions.

**Copy fails silently**: The AMI shows "failed" state. Describe the image to see the state reason:

```bash
# Check why an AMI copy failed
aws ec2 describe-images \
    --region eu-west-1 \
    --image-ids ami-failed-123 \
    --query 'Images[0].StateReason'
```

## Best Practices

1. **Automate multi-region copies as part of your CI/CD pipeline.** Don't rely on manual copies - they get forgotten.

2. **Encrypt during copy if the source isn't encrypted.** It's a free operation that significantly improves your security posture.

3. **Clean up old AMIs in destination regions.** It's easy to forget about copies in regions you don't look at often. Use [monitoring](https://oneuptime.com) to track resources across regions.

4. **Test DR AMIs regularly.** Launch an instance from the DR copy and verify it works. A copy that's never tested isn't really a backup.

5. **Use consistent naming across regions.** Include the region in the name so you can tell at a glance where each copy lives.

Copying AMIs across regions is a fundamental part of building resilient, globally distributed infrastructure on AWS. Whether it's for disaster recovery, regulatory compliance, or serving users worldwide, the process is simple once you have it automated.
