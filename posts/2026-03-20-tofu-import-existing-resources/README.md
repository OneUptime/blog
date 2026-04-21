# How to Use tofu import to Import Existing Resources - Tofu Existing Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use tofu import and import blocks to bring existing cloud resources under OpenTofu management without destroying and recreating them.

## Introduction

When you have existing cloud resources that were created manually or by another tool, you can bring them under OpenTofu management using `import`. OpenTofu 1.6+ supports declarative `import` blocks in addition to the `tofu import` CLI command. This guide covers both approaches.

## Method 1: Import Blocks (Recommended, OpenTofu 1.6+)

Declare imports in your configuration:

```hcl
# imports.tf

import {
  to = aws_vpc.main
  id = "vpc-0a1b2c3d4e5f6789"
}

import {
  to = aws_instance.web
  id = "i-0123456789abcdef0"
}
```

Then plan and apply:

```bash
# Preview the import
tofu plan

# The plan shows what will be imported:
# aws_vpc.main will be imported
#   id = "vpc-0a1b2c3d4e5f6789"
# aws_instance.web will be imported
#   id = "i-0123456789abcdef0"

# Apply the import
tofu apply
```

## Method 2: CLI Import

You can also import resources with the CLI command:

```bash
# Import syntax:
# tofu import <resource_address> <resource_id>

# Import a VPC
tofu import aws_vpc.main vpc-0a1b2c3d4e5f6789

# Import an EC2 instance
tofu import aws_instance.web i-0123456789abcdef0

# Import an S3 bucket
tofu import aws_s3_bucket.assets my-bucket-name

# Import an RDS instance
tofu import aws_db_instance.main mydb-instance
```

## Step-by-Step Import Workflow

### 1. Write the Resource Configuration

Before importing, write an (approximate) configuration for the resource:

```hcl
# main.tf
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "main-vpc"
  }
}
```

### 2. Import the Resource

```bash
tofu import aws_vpc.main vpc-0a1b2c3d4e5f6789
# aws_vpc.main: Importing from ID "vpc-0a1b2c3d4e5f6789"...
# aws_vpc.main: Import prepared!
#   Prepared aws_vpc for import
# aws_vpc.main: Refreshing state... [id=vpc-0a1b2c3d4e5f6789]
# Import successful!
```

### 3. Reconcile the Configuration

After import, run `tofu plan` to see what doesn't match:

```bash
tofu plan

# Output might show:
# ~ aws_vpc.main will be updated in-place
#   ~ enable_dns_support = false -> true  # Your config had wrong value
```

Update your configuration to match the real resource state, then run plan again until you see:

```text
No changes. Your infrastructure matches the configuration.
```

## Finding Resource Import IDs

Each resource type has a specific import ID format. Check the provider docs:

```bash
# AWS EC2 Instance
tofu import aws_instance.web i-0123456789abcdef0

# AWS VPC
tofu import aws_vpc.main vpc-0a1b2c3d4e5f6789

# AWS S3 Bucket
tofu import aws_s3_bucket.assets my-unique-bucket-name

# AWS Security Group
tofu import aws_security_group.app sg-0a1b2c3d4e5f6789

# AWS RDS Instance
tofu import aws_db_instance.main my-rds-identifier

# AWS IAM Role
tofu import aws_iam_role.app my-role-name

# AWS Route53 Record (zone_id_record_name_record_type)
tofu import aws_route53_record.www Z1PA6795UKMFR9_example.com_A
```

## Generate Config with -generate-config-out

OpenTofu 1.6+ can generate configuration from imported resources:

```hcl
# imports.tf - just the import block, no resource block needed
import {
  to = aws_vpc.main
  id = "vpc-0a1b2c3d4e5f6789"
}
```

```bash
# Generate configuration for imported resources
tofu plan -generate-config-out=generated.tf

# Review and clean up the generated configuration
cat generated.tf

# Apply the imports
tofu apply
```

## Conclusion

Importing existing resources is essential when adopting Infrastructure as Code for brownfield environments. Use import blocks (OpenTofu 1.6+) for declarative, reviewable imports, and combine with `-generate-config-out` (1.6+) to automatically generate the resource configuration. After any import, reconcile your configuration until `tofu plan` shows no changes to ensure your IaC accurately reflects reality.
