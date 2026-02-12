# How to Encrypt EBS Volumes on Existing EC2 Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, EBS, Encryption, Security, KMS

Description: Step-by-step guide to adding encryption to existing unencrypted EBS volumes, including root volume encryption and enabling default encryption for new volumes.

---

EBS encryption protects your data at rest, in transit between the volume and the instance, and in any snapshots created from the volume. There's no performance penalty for encrypted volumes, and once enabled, encryption is completely transparent to the OS and applications.

The catch is that you can't encrypt an existing unencrypted volume in place. You need to create an encrypted copy. This guide walks through the process for both data volumes and root volumes.

## Why Encrypt?

- **Compliance** - Many frameworks (HIPAA, SOC 2, PCI DSS, GDPR) require encryption at rest
- **No performance penalty** - EBS encryption uses AES-256 and is handled by the instance's hardware
- **Automatic key management** - AWS KMS handles the encryption keys
- **Snapshot encryption** - Snapshots of encrypted volumes are automatically encrypted
- **It's free** - No additional charge for EBS encryption (KMS has a small cost for API calls)

## Encrypting a Data Volume

The process: snapshot the unencrypted volume, copy the snapshot with encryption enabled, create a new volume from the encrypted snapshot, then swap the volumes.

### Step 1: Create a Snapshot of the Unencrypted Volume

```bash
# Create a snapshot of the existing unencrypted volume
SNAP_ID=$(aws ec2 create-snapshot \
    --volume-id vol-unencrypted-0123456 \
    --description "Snapshot for encryption migration" \
    --query 'SnapshotId' \
    --output text)

echo "Snapshot: $SNAP_ID"

# Wait for the snapshot to complete
aws ec2 wait snapshot-completed --snapshot-ids $SNAP_ID
```

### Step 2: Copy the Snapshot with Encryption

```bash
# Copy the snapshot with encryption enabled
ENCRYPTED_SNAP=$(aws ec2 copy-snapshot \
    --source-region us-east-1 \
    --source-snapshot-id $SNAP_ID \
    --description "Encrypted copy of data volume" \
    --encrypted \
    --query 'SnapshotId' \
    --output text)

echo "Encrypted snapshot: $ENCRYPTED_SNAP"

# Wait for the copy to complete
aws ec2 wait snapshot-completed --snapshot-ids $ENCRYPTED_SNAP
```

By default, this uses the AWS-managed key `aws/ebs`. To use a customer-managed key:

```bash
# Copy with a specific KMS key
ENCRYPTED_SNAP=$(aws ec2 copy-snapshot \
    --source-region us-east-1 \
    --source-snapshot-id $SNAP_ID \
    --encrypted \
    --kms-key-id arn:aws:kms:us-east-1:123456789012:key/mrk-abc123 \
    --description "Encrypted with custom KMS key" \
    --query 'SnapshotId' \
    --output text)
```

### Step 3: Create an Encrypted Volume

```bash
# Get the AZ of the instance
AZ=$(aws ec2 describe-instances \
    --instance-ids i-0123456789abcdef0 \
    --query 'Reservations[0].Instances[0].Placement.AvailabilityZone' \
    --output text)

# Create an encrypted volume from the encrypted snapshot
ENCRYPTED_VOL=$(aws ec2 create-volume \
    --snapshot-id $ENCRYPTED_SNAP \
    --volume-type gp3 \
    --availability-zone $AZ \
    --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=data-volume-encrypted}]' \
    --query 'VolumeId' \
    --output text)

aws ec2 wait volume-available --volume-ids $ENCRYPTED_VOL
```

### Step 4: Swap the Volumes

On the instance:

```bash
# Unmount the old volume
sudo umount /data
```

Then swap at the AWS level:

```bash
# Detach the old unencrypted volume
aws ec2 detach-volume --volume-id vol-unencrypted-0123456
aws ec2 wait volume-available --volume-ids vol-unencrypted-0123456

# Attach the encrypted volume at the same device
aws ec2 attach-volume \
    --volume-id $ENCRYPTED_VOL \
    --instance-id i-0123456789abcdef0 \
    --device /dev/xvdf
```

On the instance:

```bash
# Mount the encrypted volume
sudo mount /dev/xvdf /data

# Update fstab with the new UUID
NEW_UUID=$(sudo blkid -s UUID -o value /dev/xvdf)
# Edit /etc/fstab and replace the old UUID

# Verify data integrity
ls -la /data
```

## Encrypting the Root Volume

Root volume encryption requires stopping the instance because you need to swap the root device.

### Complete Script

```bash
#!/bin/bash
# Encrypt the root volume of an EC2 instance

INSTANCE_ID=$1

if [ -z "$INSTANCE_ID" ]; then
    echo "Usage: $0 <instance-id>"
    exit 1
fi

# Get instance details
ROOT_VOL=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId' \
    --output text)

ROOT_DEVICE=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].RootDeviceName' \
    --output text)

AZ=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].Placement.AvailabilityZone' \
    --output text)

echo "Instance: $INSTANCE_ID"
echo "Root Volume: $ROOT_VOL"
echo "Root Device: $ROOT_DEVICE"
echo "AZ: $AZ"

# Check if already encrypted
ENCRYPTED=$(aws ec2 describe-volumes \
    --volume-ids $ROOT_VOL \
    --query 'Volumes[0].Encrypted' \
    --output text)

if [ "$ENCRYPTED" = "true" ]; then
    echo "Root volume is already encrypted. Nothing to do."
    exit 0
fi

# Step 1: Stop the instance
echo "Stopping instance..."
aws ec2 stop-instances --instance-ids $INSTANCE_ID
aws ec2 wait instance-stopped --instance-ids $INSTANCE_ID
echo "Instance stopped."

# Step 2: Create snapshot
echo "Creating snapshot of root volume..."
SNAP_ID=$(aws ec2 create-snapshot \
    --volume-id $ROOT_VOL \
    --description "Root volume encryption migration for $INSTANCE_ID" \
    --query 'SnapshotId' \
    --output text)
aws ec2 wait snapshot-completed --snapshot-ids $SNAP_ID
echo "Snapshot: $SNAP_ID"

# Step 3: Create encrypted copy
echo "Creating encrypted snapshot copy..."
ENC_SNAP=$(aws ec2 copy-snapshot \
    --source-region $(echo $AZ | sed 's/[a-z]$//') \
    --source-snapshot-id $SNAP_ID \
    --encrypted \
    --description "Encrypted root for $INSTANCE_ID" \
    --query 'SnapshotId' \
    --output text)
aws ec2 wait snapshot-completed --snapshot-ids $ENC_SNAP
echo "Encrypted snapshot: $ENC_SNAP"

# Step 4: Create encrypted volume
echo "Creating encrypted volume..."
ENC_VOL=$(aws ec2 create-volume \
    --snapshot-id $ENC_SNAP \
    --volume-type gp3 \
    --availability-zone $AZ \
    --tag-specifications "ResourceType=volume,Tags=[{Key=Name,Value=encrypted-root-$INSTANCE_ID}]" \
    --query 'VolumeId' \
    --output text)
aws ec2 wait volume-available --volume-ids $ENC_VOL
echo "Encrypted volume: $ENC_VOL"

# Step 5: Detach old root volume
echo "Detaching old root volume..."
aws ec2 detach-volume --volume-id $ROOT_VOL
aws ec2 wait volume-available --volume-ids $ROOT_VOL

# Step 6: Attach encrypted volume as root
echo "Attaching encrypted volume as root..."
aws ec2 attach-volume \
    --volume-id $ENC_VOL \
    --instance-id $INSTANCE_ID \
    --device $ROOT_DEVICE

sleep 5

# Step 7: Start the instance
echo "Starting instance..."
aws ec2 start-instances --instance-ids $INSTANCE_ID
aws ec2 wait instance-running --instance-ids $INSTANCE_ID
aws ec2 wait instance-status-ok --instance-ids $INSTANCE_ID

echo "Instance $INSTANCE_ID is running with encrypted root volume $ENC_VOL"
echo ""
echo "Old unencrypted volume $ROOT_VOL is now detached."
echo "Verify everything works, then delete it and the intermediate snapshots."
```

## Enabling Default Encryption

Instead of encrypting volumes one by one, set up default encryption so all new volumes are automatically encrypted:

```bash
# Enable default EBS encryption in the current region
aws ec2 enable-ebs-encryption-by-default

# Optionally set a specific KMS key as the default
aws ec2 modify-ebs-default-kms-key-id \
    --kms-key-id arn:aws:kms:us-east-1:123456789012:key/mrk-abc123

# Verify the settings
aws ec2 get-ebs-encryption-by-default
aws ec2 get-ebs-default-kms-key-id
```

After enabling this, every new EBS volume in the region is encrypted by default. Existing volumes aren't affected - you still need to encrypt those manually.

Do this in every region you use:

```bash
# Enable default encryption in all regions
for REGION in $(aws ec2 describe-regions --query 'Regions[*].RegionName' --output text); do
    echo "Enabling default encryption in $REGION..."
    aws ec2 enable-ebs-encryption-by-default --region $REGION
done
```

## AWS vs Customer-Managed KMS Keys

**AWS-managed key (aws/ebs)**:
- No setup required
- Free (no KMS charges)
- Can't share encrypted snapshots across accounts
- Can't control key rotation schedule
- Can't revoke access granularly

**Customer-managed KMS key**:
- You create and manage the key
- Small KMS charges (~$1/month per key + API call charges)
- Can share encrypted snapshots across accounts
- Can control key rotation
- Can grant/revoke access through key policies

For most organizations, customer-managed keys are worth the small cost for the additional control. They're essential if you need to share encrypted AMIs or snapshots across accounts. See our guide on [sharing AMIs across accounts](https://oneuptime.com/blog/post/share-ami-across-aws-accounts/view) for details.

## Finding Unencrypted Volumes

Audit your account for unencrypted volumes:

```bash
# List all unencrypted volumes
aws ec2 describe-volumes \
    --filters "Name=encrypted,Values=false" \
    --query 'Volumes[*].[VolumeId,Size,State,Attachments[0].InstanceId,Tags[?Key==`Name`].Value | [0]]' \
    --output table
```

Use AWS Config to continuously monitor for unencrypted volumes and get alerted when one is created:

```bash
# AWS Config rule to detect unencrypted volumes
aws configservice put-config-rule --config-rule '{
    "ConfigRuleName": "encrypted-volumes",
    "Source": {
        "Owner": "AWS",
        "SourceIdentifier": "ENCRYPTED_VOLUMES"
    }
}'
```

## Monitoring

After encrypting your volumes, set up [monitoring with OneUptime](https://oneuptime.com) to track your encryption compliance posture across your infrastructure. Combine this with AWS Config rules to catch any unencrypted volumes that slip through.

## Best Practices

1. **Enable default encryption immediately.** It's a one-time, region-level setting that prevents unencrypted volumes from being created.

2. **Use customer-managed keys for production.** The extra control is worth the minimal cost.

3. **Encrypt in all regions**, even ones you don't actively use. It prevents someone from accidentally creating unencrypted resources.

4. **Plan for downtime when encrypting root volumes.** The instance needs to be stopped for root volume swaps.

5. **Keep the old unencrypted volume briefly.** Don't delete it immediately after the swap. Verify the encrypted volume works correctly first, then clean up.

6. **Audit regularly.** Even with default encryption, check for unencrypted volumes that might predate the setting or have been created through exceptions.

EBS encryption is one of the easiest security improvements you can make on AWS. There's no performance cost, no application changes needed, and it satisfies a common compliance requirement. If your volumes aren't encrypted yet, start the migration today.
