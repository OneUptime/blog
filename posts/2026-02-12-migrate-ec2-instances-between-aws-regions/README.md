# How to Migrate EC2 Instances Between AWS Regions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, Migration, Cross-Region, AMI, Disaster Recovery

Description: Migrate EC2 instances between AWS regions using AMI copies, snapshot replication, and automation for disaster recovery or latency optimization.

---

Moving an EC2 instance from one AWS region to another is more involved than moving between availability zones. Regions are completely separate - they have different AMI registries, different VPCs, different security groups, and different network configurations. You can't just point an instance at a new region. You need to copy the AMI across regions, recreate the supporting infrastructure, and launch fresh in the target region.

## When Cross-Region Migration Makes Sense

There are a few common scenarios:
- **Latency reduction**: Moving closer to your users
- **Disaster recovery**: Setting up a DR site in a different region
- **Compliance**: Data residency requirements mandate a specific region
- **Cost savings**: Some regions are cheaper than others for the same instance types
- **Capacity**: Your current region is capacity-constrained

## Step 1: Copy the AMI

The foundation of cross-region migration is AMI copy. First, create an AMI from your source instance, then copy it to the target region:

```bash
# Create an AMI from the source instance (stop it first for consistency)
aws ec2 stop-instances --instance-ids i-0abc123 --region us-east-1
aws ec2 wait instance-stopped --instance-ids i-0abc123 --region us-east-1

# Create the AMI
SOURCE_AMI=$(aws ec2 create-image \
  --instance-id i-0abc123 \
  --name "cross-region-migration-$(date +%Y%m%d)" \
  --description "AMI for cross-region migration to eu-west-1" \
  --region us-east-1 \
  --query 'ImageId' --output text)

echo "Source AMI: $SOURCE_AMI"

# Wait for AMI to be available
aws ec2 wait image-available --image-ids $SOURCE_AMI --region us-east-1
```

Now copy it to the target region:

```bash
# Copy the AMI to the target region
TARGET_AMI=$(aws ec2 copy-image \
  --source-image-id $SOURCE_AMI \
  --source-region us-east-1 \
  --region eu-west-1 \
  --name "migrated-from-us-east-1-$(date +%Y%m%d)" \
  --description "Migrated from us-east-1" \
  --encrypted \
  --query 'ImageId' --output text)

echo "Target AMI: $TARGET_AMI (copying to eu-west-1)"

# Wait for the copy to complete (this can take a while for large AMIs)
aws ec2 wait image-available --image-ids $TARGET_AMI --region eu-west-1
echo "AMI copy complete"
```

The `--encrypted` flag encrypts the AMI in the target region. If your source AMI is already encrypted with a custom KMS key, you'll need to specify the target region's KMS key:

```bash
# Copy an encrypted AMI with a different KMS key in the target region
aws ec2 copy-image \
  --source-image-id $SOURCE_AMI \
  --source-region us-east-1 \
  --region eu-west-1 \
  --name "migrated-encrypted" \
  --encrypted \
  --kms-key-id "arn:aws:kms:eu-west-1:123456789:key/target-key-id"
```

## Step 2: Set Up Target Region Infrastructure

The target region needs VPC, subnets, security groups, and other networking components. If you don't already have these, create them:

```bash
# Create a VPC in the target region
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.1.0.0/16 \
  --region eu-west-1 \
  --query 'Vpc.VpcId' --output text)

# Create subnets
SUBNET_ID=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.1.1.0/24 \
  --availability-zone eu-west-1a \
  --region eu-west-1 \
  --query 'Subnet.SubnetId' --output text)

# Create a security group matching the source
SG_ID=$(aws ec2 create-security-group \
  --group-name "migrated-app-sg" \
  --description "Security group for migrated application" \
  --vpc-id $VPC_ID \
  --region eu-west-1 \
  --query 'GroupId' --output text)

# Add the same rules as the source security group
aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region eu-west-1

aws ec2 authorize-security-group-ingress \
  --group-id $SG_ID \
  --protocol tcp \
  --port 22 \
  --cidr 10.0.0.0/8 \
  --region eu-west-1
```

## Step 3: Launch in Target Region

```bash
# Launch the instance in the target region
NEW_INSTANCE=$(aws ec2 run-instances \
  --image-id $TARGET_AMI \
  --instance-type m5.large \
  --subnet-id $SUBNET_ID \
  --security-group-ids $SG_ID \
  --key-name my-key-eu \
  --region eu-west-1 \
  --tag-specifications 'ResourceType=instance,Tags=[
    {Key=Name,Value=migrated-app-server},
    {Key=MigratedFrom,Value=us-east-1},
    {Key=SourceInstance,Value=i-0abc123}
  ]' \
  --query 'Instances[0].InstanceId' --output text)

echo "New instance: $NEW_INSTANCE in eu-west-1"

# Wait for it to be running
aws ec2 wait instance-running --instance-ids $NEW_INSTANCE --region eu-west-1
```

## Migrating Multiple Volumes

If your instance has additional EBS volumes, you need to migrate them separately:

```bash
# List all volumes attached to the source instance
aws ec2 describe-volumes \
  --filters "Name=attachment.instance-id,Values=i-0abc123" \
  --region us-east-1 \
  --query 'Volumes[*].{
    VolumeId: VolumeId,
    Device: Attachments[0].Device,
    Size: Size,
    Type: VolumeType
  }' --output table

# For each additional volume, create a snapshot and copy it
SNAPSHOT_ID=$(aws ec2 create-snapshot \
  --volume-id vol-data123 \
  --description "Cross-region migration - data volume" \
  --region us-east-1 \
  --query 'SnapshotId' --output text)

aws ec2 wait snapshot-completed --snapshot-ids $SNAPSHOT_ID --region us-east-1

# Copy the snapshot to the target region
TARGET_SNAPSHOT=$(aws ec2 copy-snapshot \
  --source-snapshot-id $SNAPSHOT_ID \
  --source-region us-east-1 \
  --region eu-west-1 \
  --description "Data volume from us-east-1" \
  --encrypted \
  --query 'SnapshotId' --output text)

# Wait for snapshot copy
aws ec2 wait snapshot-completed --snapshot-ids $TARGET_SNAPSHOT --region eu-west-1

# Create a volume from the snapshot in the target region
DATA_VOLUME=$(aws ec2 create-volume \
  --snapshot-id $TARGET_SNAPSHOT \
  --availability-zone eu-west-1a \
  --volume-type gp3 \
  --region eu-west-1 \
  --query 'VolumeId' --output text)

aws ec2 wait volume-available --volume-ids $DATA_VOLUME --region eu-west-1

# Attach to the new instance
aws ec2 attach-volume \
  --volume-id $DATA_VOLUME \
  --instance-id $NEW_INSTANCE \
  --device /dev/sdf \
  --region eu-west-1
```

## Automated Migration Script

Here's a more complete script that handles the full cross-region migration:

```bash
#!/bin/bash
# migrate-cross-region.sh
# Migrate an EC2 instance from one region to another

set -e

SOURCE_INSTANCE=$1
SOURCE_REGION=$2
TARGET_REGION=$3
TARGET_SUBNET=$4
TARGET_SG=$5

if [ $# -lt 5 ]; then
  echo "Usage: $0 <instance-id> <source-region> <target-region> <target-subnet> <target-sg>"
  exit 1
fi

echo "=== Cross-Region Migration ==="
echo "Source: $SOURCE_INSTANCE in $SOURCE_REGION"
echo "Target: $TARGET_REGION"

# Get instance details
INSTANCE_TYPE=$(aws ec2 describe-instances \
  --instance-ids $SOURCE_INSTANCE \
  --region $SOURCE_REGION \
  --query 'Reservations[0].Instances[0].InstanceType' --output text)

echo "Instance type: $INSTANCE_TYPE"

# Create AMI
echo "Creating AMI..."
AMI_ID=$(aws ec2 create-image \
  --instance-id $SOURCE_INSTANCE \
  --name "migration-${SOURCE_INSTANCE}-$(date +%s)" \
  --region $SOURCE_REGION \
  --query 'ImageId' --output text)

echo "Waiting for AMI $AMI_ID..."
aws ec2 wait image-available --image-ids $AMI_ID --region $SOURCE_REGION

# Copy AMI to target region
echo "Copying AMI to $TARGET_REGION..."
TARGET_AMI=$(aws ec2 copy-image \
  --source-image-id $AMI_ID \
  --source-region $SOURCE_REGION \
  --region $TARGET_REGION \
  --name "migrated-${SOURCE_INSTANCE}" \
  --encrypted \
  --query 'ImageId' --output text)

echo "Waiting for AMI copy $TARGET_AMI..."
aws ec2 wait image-available --image-ids $TARGET_AMI --region $TARGET_REGION

# Launch in target region
echo "Launching in $TARGET_REGION..."
NEW_INSTANCE=$(aws ec2 run-instances \
  --image-id $TARGET_AMI \
  --instance-type $INSTANCE_TYPE \
  --subnet-id $TARGET_SUBNET \
  --security-group-ids $TARGET_SG \
  --region $TARGET_REGION \
  --tag-specifications "ResourceType=instance,Tags=[
    {Key=Name,Value=migrated-from-${SOURCE_REGION}},
    {Key=MigratedFrom,Value=${SOURCE_REGION}},
    {Key=SourceInstance,Value=${SOURCE_INSTANCE}}
  ]" \
  --query 'Instances[0].InstanceId' --output text)

aws ec2 wait instance-running --instance-ids $NEW_INSTANCE --region $TARGET_REGION

echo "=== Migration Complete ==="
echo "New instance: $NEW_INSTANCE in $TARGET_REGION"
```

## Data Sync Considerations

For databases or applications with changing data, the AMI approach captures a point-in-time snapshot. You may need continuous replication:

- **Database replication**: Set up cross-region read replicas (RDS) or streaming replication (self-managed databases) before cutover
- **File sync**: Use AWS DataSync or rsync over VPN/peering for ongoing file synchronization
- **S3 data**: Enable cross-region replication on S3 buckets

## DNS Cutover

Use Route 53 weighted routing to gradually shift traffic to the new region:

```bash
# Create a weighted record pointing to the new region (start with low weight)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [
      {
        "Action": "CREATE",
        "ResourceRecordSet": {
          "Name": "app.example.com",
          "Type": "A",
          "SetIdentifier": "eu-west-1",
          "Weight": 10,
          "TTL": 60,
          "ResourceRecords": [{"Value": "52.1.2.3"}]
        }
      }
    ]
  }'
```

Start with 10% weight on the new region, monitor for issues, then gradually increase to 100%.

## Cost of Cross-Region Data Transfer

Moving data between regions isn't free. AMI copies and snapshot copies incur data transfer charges:

| Data Size | Approximate Transfer Cost |
|-----------|-------------------------|
| 50 GB | ~$1.00 |
| 500 GB | ~$10.00 |
| 5 TB | ~$100.00 |

Plan for this in your migration budget, especially if you're moving many instances with large volumes.

For monitoring your instances in the new region, make sure you set up [CloudWatch detailed monitoring](https://oneuptime.com/blog/post/monitor-ec2-instances-with-cloudwatch-detailed-monitoring/view) and the [CloudWatch agent](https://oneuptime.com/blog/post/install-and-configure-the-cloudwatch-agent-on-ec2/view) early so you have baseline metrics before cutting over production traffic.

Cross-region migration takes planning, but the individual steps are straightforward. The hardest part is usually not the compute migration itself but the surrounding infrastructure - DNS, load balancers, databases, caches, and all the other services your application depends on. Map out those dependencies first, and the migration will go much smoother.
