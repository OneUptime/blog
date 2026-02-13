# How to Restore an EC2 Instance from an EBS Snapshot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, EBS, Snapshots, Disaster Recovery, Backup

Description: A complete guide to restoring EC2 instances from EBS snapshots, covering root volume replacement, data volume recovery, and full instance rebuilds.

---

Creating snapshots is only half of the backup story. The other half is knowing how to restore from them when things go wrong. Whether you've lost data to an application bug, filesystem corruption, or accidental deletion, EBS snapshots let you get back to a known good state.

This guide covers three restoration scenarios: replacing just a data volume, swapping the root volume, and rebuilding an entire instance from snapshots.

## Scenario 1: Restoring a Data Volume

This is the simplest case. You have a snapshot of a data volume (not the root/OS volume) and want to get that data back.

### Step 1: Create a Volume from the Snapshot

```bash
# Create a new volume from the snapshot
# IMPORTANT: The AZ must match your instance's AZ
INSTANCE_AZ=$(aws ec2 describe-instances \
    --instance-ids i-0123456789abcdef0 \
    --query 'Reservations[0].Instances[0].Placement.AvailabilityZone' \
    --output text)

VOL_ID=$(aws ec2 create-volume \
    --snapshot-id snap-0123456789abcdef0 \
    --volume-type gp3 \
    --availability-zone $INSTANCE_AZ \
    --tag-specifications 'ResourceType=volume,Tags=[{Key=Name,Value=restored-data-volume}]' \
    --query 'VolumeId' \
    --output text)

echo "Created volume: $VOL_ID"

# Wait for the volume to be available
aws ec2 wait volume-available --volume-ids $VOL_ID
```

### Step 2: Detach the Old Volume (If Still Attached)

If the original volume is still attached and you want to replace it:

```bash
# On the instance: unmount the volume first
sudo umount /data

# Detach the old volume
aws ec2 detach-volume --volume-id vol-old-0123456789
aws ec2 wait volume-available --volume-ids vol-old-0123456789
```

### Step 3: Attach and Mount the Restored Volume

```bash
# Attach the restored volume
aws ec2 attach-volume \
    --volume-id $VOL_ID \
    --instance-id i-0123456789abcdef0 \
    --device /dev/xvdf

# Wait a moment for the device to appear, then mount on the instance
sleep 10
```

On the instance:

```bash
# Mount the restored volume (no formatting needed - it already has data)
sudo mount /dev/xvdf /data

# Verify your data is there
ls -la /data

# Update fstab if the UUID changed
sudo blkid /dev/xvdf
# Update /etc/fstab with the new UUID
```

### Alternative: Mount as a Secondary Volume for Cherry-Picking

If you don't want to replace the entire volume but just need specific files:

```bash
# Mount the restored volume at a temporary location
sudo mkdir -p /mnt/restored
sudo mount /dev/xvdg /mnt/restored

# Copy specific files you need
sudo cp /mnt/restored/path/to/important/file /data/path/to/important/file

# Unmount and clean up
sudo umount /mnt/restored
```

Then detach and delete the temporary volume.

## Scenario 2: Replacing the Root Volume

This is trickier because the instance needs to be stopped to swap the root volume. This process is useful when the OS is corrupted, misconfigured, or you need to roll back a bad update.

### Step 1: Stop the Instance

```bash
# Stop the instance (required for root volume operations)
aws ec2 stop-instances --instance-ids i-0123456789abcdef0
aws ec2 wait instance-stopped --instance-ids i-0123456789abcdef0
```

### Step 2: Note the Current Root Volume Details

```bash
# Get the current root volume ID and device name
ROOT_INFO=$(aws ec2 describe-instances \
    --instance-ids i-0123456789abcdef0 \
    --query 'Reservations[0].Instances[0].{RootDevice:RootDeviceName,BlockDevices:BlockDeviceMappings}')

echo $ROOT_INFO

# Typically: /dev/xvda or /dev/sda1 with vol-xxxxx
```

### Step 3: Detach the Old Root Volume

```bash
OLD_ROOT_VOL="vol-old-root-id"

# Detach the old root volume
aws ec2 detach-volume --volume-id $OLD_ROOT_VOL
aws ec2 wait volume-available --volume-ids $OLD_ROOT_VOL
```

### Step 4: Create a New Volume from the Snapshot

```bash
# Create new volume from the root snapshot
NEW_ROOT_VOL=$(aws ec2 create-volume \
    --snapshot-id snap-root-0123456789 \
    --volume-type gp3 \
    --availability-zone us-east-1a \
    --query 'VolumeId' \
    --output text)

aws ec2 wait volume-available --volume-ids $NEW_ROOT_VOL
```

### Step 5: Attach as Root Volume

```bash
# Attach the new volume as the root device
aws ec2 attach-volume \
    --volume-id $NEW_ROOT_VOL \
    --instance-id i-0123456789abcdef0 \
    --device /dev/xvda  # Use the same device name as the original root

aws ec2 wait instance-stopped --instance-ids i-0123456789abcdef0
```

### Step 6: Start the Instance

```bash
# Start the instance with the restored root volume
aws ec2 start-instances --instance-ids i-0123456789abcdef0
aws ec2 wait instance-running --instance-ids i-0123456789abcdef0
```

### Using the Replace Root Volume Feature

AWS also provides a simpler way to replace root volumes without manually detaching/attaching:

```bash
# Replace root volume using a snapshot (instance must be stopped)
aws ec2 create-replace-root-volume-task \
    --instance-id i-0123456789abcdef0 \
    --snapshot-id snap-root-0123456789

# Check the task status
aws ec2 describe-replace-root-volume-tasks \
    --replace-root-volume-task-ids replacevol-0123456789
```

This method handles the detach/create/attach process for you.

## Scenario 3: Full Instance Rebuild

If you need to recreate an instance from scratch using snapshots, the cleanest approach is through an AMI. If you have an AMI, great. If you only have snapshots, you can create an AMI from them.

### Create an AMI from Snapshots

```bash
# Register an AMI from a root volume snapshot
aws ec2 register-image \
    --name "restored-webapp-$(date +%Y%m%d)" \
    --root-device-name /dev/xvda \
    --block-device-mappings '[
        {
            "DeviceName": "/dev/xvda",
            "Ebs": {
                "SnapshotId": "snap-root-0123456789",
                "VolumeSize": 50,
                "VolumeType": "gp3",
                "DeleteOnTermination": true
            }
        },
        {
            "DeviceName": "/dev/xvdf",
            "Ebs": {
                "SnapshotId": "snap-data-0123456789",
                "VolumeSize": 100,
                "VolumeType": "gp3",
                "DeleteOnTermination": false
            }
        }
    ]' \
    --architecture x86_64 \
    --virtualization-type hvm \
    --ena-support
```

### Launch from the AMI

```bash
# Launch a new instance from the restored AMI
aws ec2 run-instances \
    --image-id ami-restored-0123456789 \
    --instance-type m7g.large \
    --key-name my-key \
    --security-group-ids sg-0123456789abcdef0 \
    --subnet-id subnet-0123456789abcdef0
```

If the original instance had an Elastic IP, reassociate it:

```bash
# Move the Elastic IP to the new instance
aws ec2 associate-address \
    --allocation-id eipalloc-0123456789 \
    --instance-id i-new-instance-id \
    --allow-reassociation
```

## Complete Disaster Recovery Script

Here's a comprehensive script for restoring an instance from its most recent snapshots:

```bash
#!/bin/bash
# Restore an EC2 instance from its most recent snapshots

INSTANCE_ID=$1

if [ -z "$INSTANCE_ID" ]; then
    echo "Usage: $0 <instance-id>"
    exit 1
fi

echo "Starting recovery for instance $INSTANCE_ID..."

# Get instance details
INSTANCE_INFO=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0]')

AZ=$(echo $INSTANCE_INFO | jq -r '.Placement.AvailabilityZone')
INSTANCE_TYPE=$(echo $INSTANCE_INFO | jq -r '.InstanceType')
SUBNET=$(echo $INSTANCE_INFO | jq -r '.SubnetId')
SG_IDS=$(echo $INSTANCE_INFO | jq -r '.SecurityGroups[].GroupId' | tr '\n' ' ')
KEY_NAME=$(echo $INSTANCE_INFO | jq -r '.KeyName')

echo "AZ: $AZ, Type: $INSTANCE_TYPE"

# Get volume IDs
VOLUMES=$(echo $INSTANCE_INFO | jq -r '.BlockDeviceMappings[].Ebs.VolumeId')

# Find most recent snapshot for each volume
for VOL_ID in $VOLUMES; do
    LATEST_SNAP=$(aws ec2 describe-snapshots \
        --filters "Name=volume-id,Values=$VOL_ID" \
        --query 'Snapshots | sort_by(@, &StartTime) | [-1].SnapshotId' \
        --output text)

    echo "Volume $VOL_ID -> Latest snapshot: $LATEST_SNAP"
done

echo ""
echo "Recovery plan prepared. Review and execute manually to proceed."
echo "1. Stop instance $INSTANCE_ID"
echo "2. Create volumes from snapshots"
echo "3. Swap volumes on the instance"
echo "4. Start instance"
```

## Cross-Region Restoration

If your snapshots are in a different region (a common DR setup), you'll need to copy them first:

```bash
# Copy a snapshot from the DR region to the primary region
COPIED_SNAP=$(aws ec2 copy-snapshot \
    --source-region us-west-2 \
    --source-snapshot-id snap-dr-0123456789 \
    --destination-region us-east-1 \
    --description "DR restore from us-west-2" \
    --query 'SnapshotId' \
    --output text)

# Wait for the copy to complete
aws ec2 wait snapshot-completed \
    --region us-east-1 \
    --snapshot-ids $COPIED_SNAP
```

For more on cross-region AMI and snapshot management, see our guide on [copying AMIs to other regions](https://oneuptime.com/blog/post/2026-02-12-copy-ami-to-another-aws-region/view).

## Testing Your Restore Process

A backup strategy isn't complete without regular restore testing. Schedule quarterly DR drills:

1. Pick a production instance
2. Find its most recent snapshots
3. Restore to a new instance in a test environment
4. Verify the application works correctly
5. Validate data integrity
6. Document any issues and update the restore procedure
7. Terminate the test instance

Set up [monitoring with OneUptime](https://oneuptime.com) to verify the restored instance is functioning correctly during your DR tests.

## Common Pitfalls

**Snapshot in wrong AZ.** Volumes must be in the same AZ as the instance. If your snapshot creates a volume in us-east-1a but your instance is in us-east-1b, you need to either create the volume in the right AZ or move the instance.

**Missing fstab entries.** Restoring a data volume doesn't automatically set up mount points. You may need to manually mount and update fstab.

**Changed UUIDs.** Volumes created from snapshots get new UUIDs. If your fstab uses UUIDs (which it should), you need to update them after restoration.

**Encryption key access.** If snapshots are encrypted with a KMS key and you're restoring in a different account, you need access to that key. See our guide on [encrypting EBS volumes](https://oneuptime.com/blog/post/2026-02-12-encrypt-ebs-volumes-on-existing-ec2-instances/view).

**Stale DNS/IP.** If the original instance had an Elastic IP or DNS records pointing to it, remember to update those after launching a replacement instance.

Restoration is the moment of truth for your backup strategy. Practice it before you need it for real.
