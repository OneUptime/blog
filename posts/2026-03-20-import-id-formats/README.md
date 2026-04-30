# How to Handle Import ID Formats for Different Resource Types in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, AWS

Description: Learn the import ID formats for common AWS resource types and how to find the correct IDs for importing existing resources into OpenTofu state.

## Introduction

Every resource type has a specific import ID format - it might be an ARN, a resource name, a combination of fields, or a custom format. Using the wrong format causes import to fail. This guide covers ID formats for common AWS resource types.

## Finding Import ID Formats

```bash
# The provider documentation lists the import format for importable resources

# Look for "Import" section at the bottom of each resource page
# Format: tofu import resource_type.name <id_format>
```

## EC2 Resources

```bash
# EC2 Instance - Instance ID
tofu import aws_instance.web i-0123456789abcdef0

# VPC - VPC ID
tofu import aws_vpc.main vpc-0a1b2c3d4e5f6789

# Subnet - Subnet ID
tofu import aws_subnet.public subnet-0a1b2c3d4e5f6789

# Security Group - Security Group ID
tofu import aws_security_group.app sg-0a1b2c3d4e5f6789

# Internet Gateway - IGW ID
tofu import aws_internet_gateway.main igw-0a1b2c3d4e5f6789

# NAT Gateway - NAT Gateway ID
tofu import aws_nat_gateway.main nat-0a1b2c3d4e5f6789

# Route Table - Route Table ID
tofu import aws_route_table.main rtb-0a1b2c3d4e5f6789

# Key Pair - Key Pair Name
tofu import aws_key_pair.deployer deployer-key

# Elastic IP - Allocation ID
tofu import aws_eip.nat eipalloc-0a1b2c3d4e5f6789
```

## S3 Resources

```bash
# S3 Bucket - Bucket Name (globally unique)
tofu import aws_s3_bucket.assets my-company-assets-bucket

# S3 Bucket Policy - Bucket Name
tofu import aws_s3_bucket_policy.assets my-company-assets-bucket

# S3 Bucket ACL - Bucket name in the simplest case; can also include expected_bucket_owner and/or acl
tofu import aws_s3_bucket_acl.main bucket-name

# S3 Object - bucket/key
tofu import aws_s3_object.config my-bucket/config/app.json
```

## IAM Resources

```bash
# IAM User - Username
tofu import aws_iam_user.jane jane.doe

# IAM Group - Group Name
tofu import aws_iam_group.developers developers

# IAM Role - Role Name
tofu import aws_iam_role.app app-service-role

# IAM Policy - Policy ARN
tofu import aws_iam_policy.custom arn:aws:iam::123456789012:policy/custom-policy

# IAM Role Policy Attachment - role_name/policy_arn
tofu import aws_iam_role_policy_attachment.app "app-role/arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"

# IAM User Group Membership - user_name/group1/group2
tofu import aws_iam_user_group_membership.jane "jane.doe/developers/admins"
```

## RDS Resources

```bash
# RDS Instance - DB Instance Identifier
tofu import aws_db_instance.main my-database

# RDS Cluster - Cluster Identifier
tofu import aws_rds_cluster.main my-cluster

# RDS Subnet Group - Name
tofu import aws_db_subnet_group.main my-db-subnet-group

# RDS Parameter Group - Name
tofu import aws_db_parameter_group.main my-db-params
```

## Route53 Resources

```bash
# Hosted Zone - Zone ID
tofu import aws_route53_zone.main Z1PA6795UKMFR9

# DNS Record - zone_id_record_name_type[_set_identifier]
tofu import aws_route53_record.api Z1PA6795UKMFR9_api.example.com_A

# Health Check - Health Check ID
tofu import aws_route53_health_check.main abc12345-1234-1234-1234-abc123456789
```

## ECS Resources

```bash
# ECS Cluster - Cluster Name
tofu import aws_ecs_cluster.main my-cluster

# ECS Service - cluster_name/service_name
tofu import aws_ecs_service.app my-cluster/my-service

# ECS Task Definition - Task definition ARN
tofu import aws_ecs_task_definition.app arn:aws:ecs:us-east-1:123456789012:task-definition/my-task-family:1
```

## EKS Resources

```bash
# EKS Cluster - Cluster Name
tofu import aws_eks_cluster.main my-eks-cluster

# EKS Node Group - cluster_name:node_group_name
tofu import aws_eks_node_group.workers my-cluster:worker-nodes

# EKS Addon - cluster_name:addon_name
tofu import aws_eks_addon.vpc_cni my-cluster:vpc-cni
```

## CloudFront

```bash
# CloudFront Distribution - Distribution ID
tofu import aws_cloudfront_distribution.main E1PA6795UKMFR9
```

## How to Find Resource IDs

```bash
# AWS CLI patterns for finding IDs

# EC2
aws ec2 describe-instances --query 'Reservations[*].Instances[*].[InstanceId,Tags[?Key==`Name`].Value|[0]]' --output table

# S3
aws s3api list-buckets --query 'Buckets[*].Name' --output table

# IAM
aws iam list-roles --query 'Roles[*].[RoleName,Arn]' --output table

# RDS
aws rds describe-db-instances --query 'DBInstances[*].DBInstanceIdentifier' --output table
```

## Conclusion

Every OpenTofu resource type has a specific import ID format documented in the provider documentation. The format might be a simple ID, a name, an ARN, or a composite of multiple values. Always check the "Import" section of the resource documentation before running an import. When in doubt, use the AWS CLI or console to find the exact identifier to use.
