# How to Import Existing AWS Resources into Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Import, Infrastructure as Code, Migration

Description: Learn how to import existing AWS resources into Terraform state including EC2 instances, S3 buckets, RDS databases, VPCs, and IAM roles for infrastructure-as-code adoption.

---

Most organizations do not start with Terraform from day one. They have existing AWS resources created through the console, CLI, or CloudFormation that need to be brought under Terraform management. The terraform import command and the import block (Terraform 1.5+) let you adopt existing resources into your Terraform state without recreating them.

In this guide, we will walk through importing common AWS resources into Terraform including EC2 instances, S3 buckets, RDS databases, VPCs, security groups, and IAM roles. We will cover both the legacy terraform import command and the modern import block approach.

## Prerequisites

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Importing EC2 Instances

First, write the resource configuration:

```hcl
# ec2.tf - Configuration for existing EC2 instance
resource "aws_instance" "app_server" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t3.large"

  tags = {
    Name = "app-server-production"
  }

  lifecycle {
    ignore_changes = [ami]  # Do not recreate on AMI changes initially
  }
}
```

Import using the command:

```bash
# Import by instance ID
terraform import aws_instance.app_server i-1234567890abcdef0
```

Or use the import block (Terraform 1.5+):

```hcl
import {
  to = aws_instance.app_server
  id = "i-1234567890abcdef0"
}
```

## Importing S3 Buckets

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "my-company-data-bucket"
}

resource "aws_s3_bucket_versioning" "data" {
  bucket = aws_s3_bucket.data.id
  versioning_configuration {
    status = "Enabled"
  }
}

import {
  to = aws_s3_bucket.data
  id = "my-company-data-bucket"
}

import {
  to = aws_s3_bucket_versioning.data
  id = "my-company-data-bucket"
}
```

## Importing VPCs and Networking

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
  tags = {
    Name = "public-subnet-1"
  }
}

resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = aws_vpc.main.id
}

import {
  to = aws_vpc.main
  id = "vpc-0abcd1234efgh5678"
}

import {
  to = aws_subnet.public
  id = "subnet-0abcd1234efgh5678"
}

import {
  to = aws_security_group.web
  id = "sg-0abcd1234efgh5678"
}
```

## Importing RDS Databases

```hcl
resource "aws_db_instance" "production" {
  identifier     = "production-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.xlarge"
  allocated_storage = 500

  skip_final_snapshot = false
  final_snapshot_identifier = "production-db-final"

  lifecycle {
    ignore_changes = [password]
  }
}

import {
  to = aws_db_instance.production
  id = "production-db"
}
```

## Importing IAM Resources

```hcl
resource "aws_iam_role" "app" {
  name = "app-production-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_policy" "app" {
  name = "app-production-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:PutObject"]
      Resource = "arn:aws:s3:::my-bucket/*"
    }]
  })
}

import {
  to = aws_iam_role.app
  id = "app-production-role"
}

import {
  to = aws_iam_policy.app
  id = "arn:aws:iam::123456789012:policy/app-production-policy"
}
```

## Import Workflow Best Practices

The general workflow for importing AWS resources is:

1. Identify the resource to import and its AWS identifier
2. Write the Terraform resource configuration
3. Add the import block or run terraform import
4. Run terraform plan to check for differences
5. Adjust the configuration until the plan shows no changes
6. Remove the import block (it is only needed once)

```bash
# Step-by-step workflow
terraform init
terraform plan  # Shows the import will happen
terraform apply # Performs the import
terraform plan  # Should show "No changes" if config matches
```

## Common AWS Import IDs

Here is a reference for common AWS resource import identifiers:

```hcl
# EC2 Instance: Instance ID
# aws_instance.example -> i-1234567890abcdef0

# S3 Bucket: Bucket name
# aws_s3_bucket.example -> my-bucket-name

# VPC: VPC ID
# aws_vpc.example -> vpc-0abcd1234

# Subnet: Subnet ID
# aws_subnet.example -> subnet-0abcd1234

# Security Group: Security Group ID
# aws_security_group.example -> sg-0abcd1234

# RDS Instance: DB Identifier
# aws_db_instance.example -> my-database

# IAM Role: Role name
# aws_iam_role.example -> my-role-name

# IAM Policy: Policy ARN
# aws_iam_policy.example -> arn:aws:iam::123456789012:policy/name

# Route 53 Record: zone_id_record-name_type
# aws_route53_record.example -> Z1234_example.com_A

# Lambda Function: Function name
# aws_lambda_function.example -> my-function
```

## Conclusion

Importing existing AWS resources into Terraform is the first step toward infrastructure-as-code adoption. The import block in Terraform 1.5+ makes this process much smoother than the legacy command. The key is to write your configuration to match the existing resource exactly, then iterate until terraform plan shows no changes. For importing from other clouds, see our guides on [Azure imports](https://oneuptime.com/blog/post/2026-02-23-how-to-import-existing-azure-resources-into-terraform/view) and [GCP imports](https://oneuptime.com/blog/post/2026-02-23-how-to-import-existing-gcp-resources-into-terraform/view).
