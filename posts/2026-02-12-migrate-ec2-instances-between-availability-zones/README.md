# How to Migrate EC2 Instances Between Availability Zones

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Migration, Availability Zones, EBS, AMI

Description: Step-by-step methods for migrating EC2 instances between availability zones, including AMI-based migration, EBS snapshot approaches, and automation scripts.

---

There are several reasons you might need to move an EC2 instance from one availability zone to another. Maybe you're consolidating workloads, rebalancing across AZs after a capacity issue, or an AZ is experiencing degraded performance. Whatever the reason, EC2 instances can't just be moved - you need to recreate them in the new AZ. There are a few ways to do this, each with different tradeoffs.

## Why You Can't Just "Move" an Instance

An EC2 instance is tightly bound to its availability zone. The underlying physical hardware, the EBS volumes, the network interfaces - they all exist within a specific AZ. There's no API call to relocate an instance to another AZ. Instead, you have to create a copy in the new AZ and decommission the old one.

## Method 1: AMI-Based Migration

This is the simplest and most reliable approach. You create an AMI from the source instance, then launch a new instance from that AMI in the target AZ.

```bash
# Step 1: Create an AMI from the source instance
AMI_ID=$(aws ec2 create-image \
  --instance-id i-0abc123source \
  --name "migration-$(date +%Y%m%d-%H%M)" \
  --description "AMI for AZ migration" \
  --query 'ImageId' --output text)

echo "Creating AMI: $AMI_ID"

# Step 2: Wait for the AMI to be available
aws ec2 wait image-available --image-ids $AMI_ID
echo "AMI is ready"

# Step 3: Get the source instance details so we can match them
SOURCE_DETAILS=$(aws ec2 describe-instances \
  --instance-ids i-0abc123source \
  --query 'Reservations[0].Instances[0].{
    Type: InstanceType,
    KeyName: KeyName,
    SecurityGroups: SecurityGroups[*].GroupId,
    IamProfile: IamInstanceProfile.Arn,
    Tags: Tags
  }')

echo "Source instance details: $SOURCE_DETAILS"

# Step 4: Launch a new instance in the target AZ
NEW_INSTANCE=$(aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type m5.large \
  --key-name my-key \
  --subnet-id subnet-target-az-b \
  --security-group-ids sg-abc123 \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=migrated-instance}]' \
  --query 'Instances[0].InstanceId' --output text)

echo "New instance: $NEW_INSTANCE"

# Step 5: Wait for the new instance to be running
aws ec2 wait instance-running --instance-ids $NEW_INSTANCE

# Step 6: Verify the new instance is healthy
aws ec2 describe-instance-status \
  --instance-ids $NEW_INSTANCE \
  --query 'InstanceStatuses[0].{
    Instance: InstanceStatus.Status,
    System: SystemStatus.Status
  }'
```

## Method 2: EBS Snapshot Migration

If you need to migrate specific volumes (not the whole instance), use snapshots:

```bash
# Step 1: Create a snapshot of the EBS volume
SNAPSHOT_ID=$(aws ec2 create-snapshot \
  --volume-id vol-0abc123 \
  --description "AZ migration snapshot" \
  --query 'SnapshotId' --output text)

echo "Creating snapshot: $SNAPSHOT_ID"

# Step 2: Wait for the snapshot to complete
aws ec2 wait snapshot-completed --snapshot-ids $SNAPSHOT_ID

# Step 3: Create a new volume from the snapshot in the target AZ
NEW_VOLUME=$(aws ec2 create-volume \
  --snapshot-id $SNAPSHOT_ID \
  --availability-zone us-east-1b \
  --volume-type gp3 \
  --iops 3000 \
  --throughput 125 \
  --query 'VolumeId' --output text)

echo "New volume: $NEW_VOLUME in us-east-1b"

# Step 4: Wait for the volume to be available
aws ec2 wait volume-available --volume-ids $NEW_VOLUME

# Step 5: Attach to the new instance
aws ec2 attach-volume \
  --volume-id $NEW_VOLUME \
  --instance-id i-0def456target \
  --device /dev/sdf
```

## Automated Migration Script

Here's a comprehensive script that handles the full migration:

```bash
#!/bin/bash
# migrate-instance-az.sh
# Migrates an EC2 instance to a different availability zone

set -e

SOURCE_INSTANCE=$1
TARGET_SUBNET=$2

if [ -z "$SOURCE_INSTANCE" ] || [ -z "$TARGET_SUBNET" ]; then
  echo "Usage: $0 <source-instance-id> <target-subnet-id>"
  exit 1
fi

echo "=== Starting AZ migration for $SOURCE_INSTANCE ==="

# Get source instance details
echo "Gathering source instance information..."
INSTANCE_TYPE=$(aws ec2 describe-instances \
  --instance-ids $SOURCE_INSTANCE \
  --query 'Reservations[0].Instances[0].InstanceType' --output text)

KEY_NAME=$(aws ec2 describe-instances \
  --instance-ids $SOURCE_INSTANCE \
  --query 'Reservations[0].Instances[0].KeyName' --output text)

SG_IDS=$(aws ec2 describe-instances \
  --instance-ids $SOURCE_INSTANCE \
  --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' --output text)

IAM_PROFILE=$(aws ec2 describe-instances \
  --instance-ids $SOURCE_INSTANCE \
  --query 'Reservations[0].Instances[0].IamInstanceProfile.Name' --output text 2>/dev/null || echo "")

echo "Type: $INSTANCE_TYPE, Key: $KEY_NAME, SGs: $SG_IDS"

# Stop the source instance for a consistent AMI
echo "Stopping source instance..."
aws ec2 stop-instances --instance-ids $SOURCE_INSTANCE
aws ec2 wait instance-stopped --instance-ids $SOURCE_INSTANCE
echo "Instance stopped"

# Create AMI
echo "Creating AMI..."
AMI_ID=$(aws ec2 create-image \
  --instance-id $SOURCE_INSTANCE \
  --name "az-migration-${SOURCE_INSTANCE}-$(date +%s)" \
  --description "Migration AMI for $SOURCE_INSTANCE" \
  --query 'ImageId' --output text)

echo "Waiting for AMI $AMI_ID..."
aws ec2 wait image-available --image-ids $AMI_ID
echo "AMI ready"

# Build the run-instances command
CMD="aws ec2 run-instances --image-id $AMI_ID --instance-type $INSTANCE_TYPE --subnet-id $TARGET_SUBNET --security-group-ids $SG_IDS"

if [ "$KEY_NAME" != "None" ] && [ -n "$KEY_NAME" ]; then
  CMD="$CMD --key-name $KEY_NAME"
fi

if [ "$IAM_PROFILE" != "None" ] && [ -n "$IAM_PROFILE" ]; then
  CMD="$CMD --iam-instance-profile Name=$IAM_PROFILE"
fi

# Copy tags from source instance
TAGS=$(aws ec2 describe-instances \
  --instance-ids $SOURCE_INSTANCE \
  --query 'Reservations[0].Instances[0].Tags' --output json)

if [ "$TAGS" != "null" ] && [ "$TAGS" != "[]" ]; then
  CMD="$CMD --tag-specifications 'ResourceType=instance,Tags=$TAGS'"
fi

# Launch the new instance
echo "Launching new instance in target AZ..."
NEW_INSTANCE=$(eval $CMD --query 'Instances[0].InstanceId' --output text)

echo "Waiting for $NEW_INSTANCE to start..."
aws ec2 wait instance-running --instance-ids $NEW_INSTANCE

echo "=== Migration complete ==="
echo "Source instance: $SOURCE_INSTANCE (stopped)"
echo "New instance: $NEW_INSTANCE (running)"
echo "AMI used: $AMI_ID"
echo ""
echo "Next steps:"
echo "1. Verify the new instance is working correctly"
echo "2. Update any DNS records, Elastic IPs, or load balancer targets"
echo "3. Terminate the source instance when confident"
echo "4. Deregister the migration AMI"
```

## Handling Elastic IPs

If the source instance has an Elastic IP, reassociate it after migration:

```bash
# Get the Elastic IP allocation ID
EIP_ALLOC=$(aws ec2 describe-addresses \
  --filters "Name=instance-id,Values=i-0abc123source" \
  --query 'Addresses[0].AllocationId' --output text)

# Disassociate from old instance
aws ec2 disassociate-address \
  --association-id $(aws ec2 describe-addresses \
    --allocation-ids $EIP_ALLOC \
    --query 'Addresses[0].AssociationId' --output text)

# Associate with new instance
aws ec2 associate-address \
  --allocation-id $EIP_ALLOC \
  --instance-id i-0def456target
```

## Handling Load Balancer Targets

If the instance is behind a load balancer:

```bash
# Deregister old instance from target group
aws elbv2 deregister-targets \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/my-tg/abc123 \
  --targets Id=i-0abc123source

# Register new instance
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/my-tg/abc123 \
  --targets Id=i-0def456target

# Wait for the new target to be healthy
aws elbv2 wait target-in-service \
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:123456789:targetgroup/my-tg/abc123 \
  --targets Id=i-0def456target
```

Make sure to configure proper [connection draining](https://oneuptime.com/blog/post/configure-connection-draining-on-a-load-balancer/view) on your load balancer so active requests aren't dropped during the switchover.

## Things to Watch Out For

**Private IP changes**: The new instance will get a different private IP unless you specify one that's available in the target subnet. If other services reference the instance by private IP, update them.

**Instance store data**: If the source instance uses instance store (ephemeral) volumes, that data won't be in the AMI. Back it up separately before stopping the instance.

**ENI attachments**: Additional network interfaces can't be migrated across AZs. You'll need to create new ENIs in the target AZ.

**Placement groups**: If the source instance is in a placement group, you'll need a placement group in the target AZ too.

**Downtime**: The instance will be down during the migration. For zero-downtime migration, run both instances simultaneously behind a load balancer and cut over gradually.

## Zero-Downtime Migration Pattern

For production workloads where downtime isn't acceptable:

1. Launch the new instance in the target AZ from an AMI
2. Deploy your application to the new instance
3. Register the new instance with the load balancer
4. Wait for it to pass health checks
5. Deregister the old instance (connection draining handles in-flight requests)
6. Terminate the old instance after draining completes

This is essentially a blue-green deployment across AZs. For an even more resilient setup, check out [multi-AZ deployments for high availability](https://oneuptime.com/blog/post/set-up-multi-az-ec2-deployments-for-high-availability/view).

Migrating between AZs isn't complicated, but it does require careful planning around IP addresses, DNS, load balancers, and any other resources that reference the instance. Take the time to inventory all dependencies before starting the migration.
