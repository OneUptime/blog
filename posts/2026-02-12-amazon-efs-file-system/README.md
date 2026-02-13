# How to Create an Amazon EFS File System

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, EFS, Storage, File System

Description: Step-by-step guide to creating an Amazon EFS file system, configuring mount targets, setting up security groups, and preparing it for use with EC2, ECS, and Lambda.

---

Amazon Elastic File System (EFS) is a managed NFS file system that you can mount on multiple compute resources simultaneously. Unlike EBS volumes, which are tied to a single EC2 instance, EFS can be shared across dozens or hundreds of instances, containers, and even Lambda functions. It grows and shrinks automatically - you never have to provision capacity.

If you need shared storage that multiple things can read and write at the same time, EFS is usually the right answer. Let's create one from scratch and get it ready for use.

## When to Use EFS

EFS makes sense when you need:

- **Shared file storage** across multiple EC2 instances (e.g., a web server fleet sharing uploaded content)
- **Persistent storage for containers** running on ECS or EKS
- **A file system for Lambda functions** that need to access large datasets or shared state
- **Home directories** for a fleet of developer workstations
- **Content management** where multiple servers need read/write access to the same files

EFS does NOT make sense when you need block storage (use EBS), object storage (use S3), or extremely low-latency storage for databases (use EBS io2 or instance store).

## Prerequisites

Before creating an EFS file system, you need:

1. A VPC with at least one subnet
2. A security group that allows NFS traffic (port 2049)
3. IAM permissions for EFS operations

Let's create the security group first:

```bash
# Create a security group for EFS
EFS_SG=$(aws ec2 create-security-group \
  --group-name "efs-mount-target-sg" \
  --description "Security group for EFS mount targets" \
  --vpc-id "vpc-0abc123def456" \
  --query "GroupId" \
  --output text)

echo "Created security group: $EFS_SG"

# Allow NFS traffic from within the VPC
# Replace the CIDR with your VPC's CIDR block
aws ec2 authorize-security-group-ingress \
  --group-id "$EFS_SG" \
  --protocol tcp \
  --port 2049 \
  --cidr "10.0.0.0/16"
```

For tighter security, restrict the source to only the security groups of instances that need access:

```bash
# Allow NFS only from a specific instance security group
aws ec2 authorize-security-group-ingress \
  --group-id "$EFS_SG" \
  --protocol tcp \
  --port 2049 \
  --source-group "sg-0webservers123"
```

## Creating the File System

Now let's create the EFS file system:

```bash
# Create an EFS file system
EFS_ID=$(aws efs create-file-system \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --encrypted \
  --tags "Key=Name,Value=shared-storage" "Key=Environment,Value=production" \
  --query "FileSystemId" \
  --output text)

echo "Created EFS file system: $EFS_ID"
```

Let's break down the key options:

- **performance-mode**: `generalPurpose` is the default and right for most workloads. Use `maxIO` only for highly parallel workloads with thousands of concurrent connections.
- **throughput-mode**: `bursting` scales throughput with the size of the file system. `provisioned` lets you specify a fixed throughput regardless of size.
- **encrypted**: Always encrypt your file systems. There's no performance penalty and no reason not to.

## Creating Mount Targets

A mount target is the network endpoint that your instances connect to. You need one mount target per Availability Zone where you want to access the file system.

```bash
# Create mount targets in each AZ
# Subnet in us-east-1a
aws efs create-mount-target \
  --file-system-id "$EFS_ID" \
  --subnet-id "subnet-0aaaa111" \
  --security-groups "$EFS_SG"

# Subnet in us-east-1b
aws efs create-mount-target \
  --file-system-id "$EFS_ID" \
  --subnet-id "subnet-0bbbb222" \
  --security-groups "$EFS_SG"

# Subnet in us-east-1c
aws efs create-mount-target \
  --file-system-id "$EFS_ID" \
  --subnet-id "subnet-0cccc333" \
  --security-groups "$EFS_SG"
```

Wait for the mount targets to become available:

```bash
# Check mount target status
aws efs describe-mount-targets \
  --file-system-id "$EFS_ID" \
  --query "MountTargets[].{AZ:AvailabilityZoneName,State:LifeCycleState,IP:IpAddress}" \
  --output table
```

You should see all mount targets in the "available" state before trying to mount the file system.

## Setting Up a File System Policy

EFS supports resource-based policies that control who can mount and access the file system. Here's a policy that enforces encryption in transit and prevents anonymous access:

```bash
# Set a file system policy
aws efs put-file-system-policy \
  --file-system-id "$EFS_ID" \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "EnforceEncryptionInTransit",
        "Effect": "Deny",
        "Principal": {"AWS": "*"},
        "Action": "*",
        "Resource": "*",
        "Condition": {
          "Bool": {
            "aws:SecureTransport": "false"
          }
        }
      },
      {
        "Sid": "PreventAnonymousAccess",
        "Effect": "Deny",
        "Principal": {"AWS": "*"},
        "Action": "*",
        "Resource": "*",
        "Condition": {
          "Bool": {
            "elasticfilesystem:AccessedViaMountTarget": "true"
          },
          "StringEquals": {
            "elasticfilesystem:AccessPointArn": ""
          }
        }
      }
    ]
  }'
```

## Creating with CloudFormation

For infrastructure-as-code, here's a CloudFormation template:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Amazon EFS File System

Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
  SubnetIds:
    Type: List<AWS::EC2::Subnet::Id>
    Description: Subnets for mount targets (one per AZ)
  AllowedSecurityGroup:
    Type: AWS::EC2::SecurityGroup::Id
    Description: Security group allowed to mount EFS

Resources:
  EFSSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: EFS mount target security group
      VpcId: !Ref VpcId
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 2049
          ToPort: 2049
          SourceSecurityGroupId: !Ref AllowedSecurityGroup

  FileSystem:
    Type: AWS::EFS::FileSystem
    Properties:
      Encrypted: true
      PerformanceMode: generalPurpose
      ThroughputMode: bursting
      FileSystemTags:
        - Key: Name
          Value: shared-storage

  MountTargetA:
    Type: AWS::EFS::MountTarget
    Properties:
      FileSystemId: !Ref FileSystem
      SubnetId: !Select [0, !Ref SubnetIds]
      SecurityGroups:
        - !Ref EFSSecurityGroup

  MountTargetB:
    Type: AWS::EFS::MountTarget
    Properties:
      FileSystemId: !Ref FileSystem
      SubnetId: !Select [1, !Ref SubnetIds]
      SecurityGroups:
        - !Ref EFSSecurityGroup

Outputs:
  FileSystemId:
    Value: !Ref FileSystem
    Export:
      Name: !Sub '${AWS::StackName}-FileSystemId'
  FileSystemDNS:
    Value: !Sub '${FileSystem}.efs.${AWS::Region}.amazonaws.com'
```

## Creating with Terraform

Here's the equivalent in Terraform:

```hcl
resource "aws_efs_file_system" "shared" {
  encrypted        = true
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"

  tags = {
    Name        = "shared-storage"
    Environment = "production"
  }
}

resource "aws_security_group" "efs" {
  name_prefix = "efs-mount-target-"
  vpc_id      = var.vpc_id

  ingress {
    from_port       = 2049
    to_port         = 2049
    protocol        = "tcp"
    security_groups = [var.allowed_security_group_id]
  }
}

resource "aws_efs_mount_target" "mount" {
  for_each = toset(var.subnet_ids)

  file_system_id  = aws_efs_file_system.shared.id
  subnet_id       = each.value
  security_groups = [aws_security_group.efs.id]
}
```

For a complete Terraform setup including lifecycle policies and access points, see our post on [setting up EFS with Terraform](https://oneuptime.com/blog/post/2026-02-12-efs-terraform-setup/view).

## Verifying the File System

After creation, verify everything looks right:

```bash
# Describe the file system
aws efs describe-file-systems \
  --file-system-id "$EFS_ID" \
  --query "FileSystems[0].{Id:FileSystemId,State:LifeCycleState,Size:SizeInBytes.Value,Encrypted:Encrypted,PerformanceMode:PerformanceMode}" \
  --output table

# List mount targets
aws efs describe-mount-targets \
  --file-system-id "$EFS_ID" \
  --query "MountTargets[].{AZ:AvailabilityZoneName,IP:IpAddress,State:LifeCycleState,SubnetId:SubnetId}" \
  --output table
```

## Cost Considerations

EFS pricing is based on how much data you store. As of this writing:

- **Standard storage**: ~$0.30/GB/month
- **Infrequent Access (IA) storage**: ~$0.016/GB/month
- **Data transfer**: Free within the same AZ, small charge across AZs

For cost optimization, enable lifecycle management to automatically move infrequently accessed files to IA storage. We cover this in detail in our post on [EFS lifecycle management for cost optimization](https://oneuptime.com/blog/post/2026-02-12-efs-lifecycle-management-cost-optimization/view).

## What's Next

With your EFS file system created and mount targets ready, you can now mount it on your compute resources. Check out our guides on:

- [Mounting EFS on EC2 instances](https://oneuptime.com/blog/post/2026-02-12-mount-efs-ec2-instances/view)
- [Mounting EFS on ECS Fargate tasks](https://oneuptime.com/blog/post/2026-02-12-mount-efs-ecs-fargate-tasks/view)
- [Mounting EFS on Lambda functions](https://oneuptime.com/blog/post/2026-02-12-mount-efs-lambda-functions/view)

## Wrapping Up

Creating an EFS file system is straightforward - the file system itself, mount targets in your subnets, and a security group to control access. The important decisions are around performance mode, throughput mode, and encryption, and for most workloads the defaults (generalPurpose, bursting, encrypted) are the right choices. Once it's created, you've got a fully managed, scalable, shared file system ready for whatever you need to throw at it.
