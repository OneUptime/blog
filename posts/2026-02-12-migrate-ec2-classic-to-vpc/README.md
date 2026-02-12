# How to Migrate from EC2-Classic to VPC

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EC2, VPC, Migration, Networking

Description: A comprehensive guide to migrating EC2 instances and resources from the deprecated EC2-Classic platform to VPC, including planning, execution, and validation steps.

---

EC2-Classic was the original networking mode for AWS, where instances ran on a flat shared network. AWS has been phasing it out for years, and accounts created after December 4, 2013 never had access to it. If you're still running resources in EC2-Classic, migration to VPC is not optional - it's a matter of when, not if.

This guide walks through the entire migration process, from planning to execution to validation.

## Understanding the Differences

Before migrating, it's important to understand what changes between EC2-Classic and VPC.

| Feature | EC2-Classic | VPC |
|---------|------------|-----|
| Network isolation | Shared flat network | Isolated virtual network |
| IP addressing | Public IPs change on stop/start | Private IPs persist, EIP available |
| Security Groups | Instance-level only | Instance and subnet level (NACLs) |
| Subnets | None | Full subnet control |
| Internet access | Direct | Via Internet Gateway |
| DNS | AWS-provided only | Customizable |
| ENI support | No | Yes, multiple interfaces |

The biggest practical changes are network isolation (your instances are no longer on a shared network) and IP address behavior (private IPs are stable and predictable in VPC).

## Planning the Migration

Migration planning is more important than the actual migration. You need to understand all your dependencies before moving anything.

Inventory your EC2-Classic resources:

```bash
# Find all instances in EC2-Classic (no VPC ID means Classic)
aws ec2 describe-instances \
  --filters "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[?!VpcId].{
    ID: InstanceId,
    Type: InstanceType,
    Name: Tags[?Key==`Name`].Value | [0],
    AZ: Placement.AvailabilityZone,
    IP: PublicIpAddress,
    SGs: SecurityGroups[].GroupName
  }' \
  --output table

# Find Classic security groups
aws ec2 describe-security-groups \
  --filters "Name=vpc-id,Values=''" \
  --query 'SecurityGroups[].{Name: GroupName, ID: GroupId, Description: Description}' \
  --output table

# Find Elastic IPs in Classic
aws ec2 describe-addresses \
  --filters "Name=domain,Values=standard" \
  --query 'Addresses[].{IP: PublicIp, Instance: InstanceId}'
```

Document every dependency:
- Which instances talk to each other?
- What DNS names or IP addresses are hard-coded in configurations?
- Which security group rules reference other Classic security groups?
- Are there Elastic IPs that need to be preserved?

## Setting Up the VPC

Design your VPC to accommodate all your Classic resources.

Create a VPC with public and private subnets across multiple AZs:

```bash
# Create the VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --query 'Vpc.VpcId' \
  --output text)

# Enable DNS
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-support
aws ec2 modify-vpc-attribute --vpc-id $VPC_ID --enable-dns-hostnames

# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --query 'InternetGateway.InternetGatewayId' \
  --output text)
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID

# Create public subnets in each AZ
for AZ in us-east-1a us-east-1b us-east-1c; do
  SUBNET_NUM=${AZ: -1}
  case $SUBNET_NUM in
    a) CIDR="10.0.1.0/24" ;;
    b) CIDR="10.0.2.0/24" ;;
    c) CIDR="10.0.3.0/24" ;;
  esac

  aws ec2 create-subnet \
    --vpc-id $VPC_ID \
    --cidr-block $CIDR \
    --availability-zone $AZ \
    --tag-specifications "ResourceType=subnet,Tags=[{Key=Name,Value=public-$AZ}]"
done

# Create route table with internet access
RT_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --query 'RouteTable.RouteTableId' \
  --output text)

aws ec2 create-route \
  --route-table-id $RT_ID \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id $IGW_ID
```

## Recreating Security Groups

Classic security groups can't be used in VPC. You need to recreate them.

Map and recreate your security groups:

```bash
# List Classic security group rules
aws ec2 describe-security-groups \
  --group-names "my-classic-sg" \
  --query 'SecurityGroups[0].IpPermissions'

# Create equivalent VPC security group
VPC_SG=$(aws ec2 create-security-group \
  --group-name "my-vpc-sg" \
  --description "Migrated from Classic: my-classic-sg" \
  --vpc-id $VPC_ID \
  --query 'GroupId' \
  --output text)

# Add the same rules (adjust for VPC - Classic SG references need to be updated)
aws ec2 authorize-security-group-ingress \
  --group-id $VPC_SG \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-id $VPC_SG \
  --protocol tcp \
  --port 22 \
  --cidr 10.0.0.0/8
```

If Classic security groups reference each other by name, you'll need to update these to reference the new VPC security group IDs.

## Migration Strategies

There are several ways to migrate instances. Choose based on your tolerance for downtime.

### Strategy 1: AMI-Based Migration (Recommended)

Create an AMI of the Classic instance and launch a new instance from it in the VPC. This is the most reliable method.

```bash
# Create an AMI from the Classic instance
AMI_ID=$(aws ec2 create-image \
  --instance-id i-classic123 \
  --name "migration-$(date +%Y%m%d)-my-server" \
  --description "AMI for Classic to VPC migration" \
  --query 'ImageId' \
  --output text)

# Wait for the AMI to be available
aws ec2 wait image-available --image-ids $AMI_ID

# Launch a new instance in VPC from the AMI
aws ec2 run-instances \
  --image-id $AMI_ID \
  --instance-type t3.medium \
  --key-name my-key \
  --subnet-id subnet-0abc123 \
  --security-group-ids $VPC_SG \
  --associate-public-ip-address \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=my-server-vpc}]'
```

### Strategy 2: ClassicLink (Interim Step)

ClassicLink lets Classic instances communicate with VPC resources during a transition period. This is useful for gradual migrations.

```bash
# Enable ClassicLink on the VPC
aws ec2 enable-vpc-classic-link --vpc-id $VPC_ID

# Link a Classic instance to the VPC
aws ec2 attach-classic-link-vpc \
  --instance-id i-classic123 \
  --vpc-id $VPC_ID \
  --groups $VPC_SG
```

With ClassicLink, the Classic instance gets a VPC private IP and can communicate with VPC instances using VPC security group rules. This lets you migrate services one at a time while maintaining communication.

## Migrating Elastic IPs

Classic Elastic IPs ("standard" domain) need to be moved to VPC ("vpc" domain).

Migrate an Elastic IP from Classic to VPC:

```bash
# Move an Elastic IP from Classic to VPC
aws ec2 move-address-to-vpc --public-ip 203.0.113.25

# Verify the move
aws ec2 describe-addresses --public-ips 203.0.113.25
```

Note: This operation is irreversible. Once an EIP is moved to VPC, it can't go back to Classic.

## Migrating RDS Instances

If you have RDS instances in EC2-Classic, they need to move too.

Migrate an RDS instance to VPC:

```bash
# Create a DB subnet group in your VPC
aws rds create-db-subnet-group \
  --db-subnet-group-name vpc-db-subnets \
  --db-subnet-group-description "VPC subnets for RDS" \
  --subnet-ids subnet-0abc123 subnet-0def456

# Modify the RDS instance to use VPC
aws rds modify-db-instance \
  --db-instance-identifier my-database \
  --db-subnet-group-name vpc-db-subnets \
  --vpc-security-group-ids sg-0abc123 \
  --apply-immediately
```

This will cause a brief period of unavailability while the database is moved.

## Post-Migration Validation

After migrating, thoroughly validate everything works.

Validation checklist:

```bash
# Verify new instances are running and accessible
aws ec2 describe-instances \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=instance-state-name,Values=running" \
  --query 'Reservations[].Instances[].{ID: InstanceId, Name: Tags[?Key==`Name`].Value | [0], State: State.Name, IP: PublicIpAddress}'

# Test connectivity between migrated instances
# (From one VPC instance, ping another)
ssh -i key.pem ec2-user@new-instance-ip "ping -c 3 10.0.1.50"

# Verify security group rules are working
aws ec2 describe-security-groups \
  --group-ids $VPC_SG \
  --query 'SecurityGroups[0].IpPermissions'

# Check that applications are responding
curl -f http://new-instance-ip/health
```

## Updating DNS and References

The final step is pointing everything at the new VPC instances.

Update DNS records and configuration:

```bash
# If using Route 53, update A records
aws route53 change-resource-record-sets \
  --hosted-zone-id Z0123456789 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "NEW_VPC_INSTANCE_IP"}]
      }
    }]
  }'
```

Lower DNS TTL values before migration so changes propagate quickly. After confirming everything works, you can raise them again.

## Decommissioning Classic Resources

Once everything is validated and running in VPC, clean up Classic resources:

```bash
# Terminate Classic instances (after confirming VPC instances are working)
aws ec2 terminate-instances --instance-ids i-classic123

# Delete Classic security groups (after no instances reference them)
aws ec2 delete-security-group --group-name my-classic-sg

# Deregister migration AMIs if no longer needed
aws ec2 deregister-image --image-id ami-migration123
```

For monitoring your newly migrated VPC infrastructure, check out our guide on [monitoring AWS infrastructure](https://oneuptime.com/blog/post/aws-infrastructure-monitoring/view).

## Wrapping Up

Migrating from EC2-Classic to VPC is a multi-step process that requires careful planning, but each individual step is straightforward. The AMI-based approach is the safest: snapshot the Classic instance, launch it in VPC, validate, then switch traffic. Use ClassicLink as a bridge during gradual migrations. And always validate thoroughly before decommissioning Classic resources. The end result is a more secure, more capable networking environment with full control over your IP space and routing.
