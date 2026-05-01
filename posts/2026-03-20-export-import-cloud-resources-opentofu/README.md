# How to Export and Import Existing Cloud Resources into OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Import, State Management, Brownfield, Infrastructure as Code

Description: Learn how to export existing cloud resources and import them into OpenTofu state using import blocks and the generate-config-out flag.

## Introduction

Most teams inherit cloud infrastructure created manually through the console, CLI, or other tools before adopting IaC. OpenTofu's import blocks, combined with the `-generate-config-out` flag, let you bring these existing resources under management without recreating them. This is the foundation of brownfield IaC adoption.

## Step 1: Discover Existing Resources

Find what resources need to be imported.

```bash
# AWS: List resources by type

aws ec2 describe-vpcs --query 'Vpcs[*].[VpcId,Tags[?Key==`Name`].Value|[0]]' --output table
aws s3api list-buckets --query 'Buckets[*].Name' --output text
aws rds describe-db-instances --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus]' --output table

# Azure: List resources in a resource group
az resource list --resource-group myapp-prod-rg --output table

# GCP: List compute instances
gcloud compute instances list
gcloud storage buckets list
```

## Step 2: Write Import Blocks

Define import blocks for the resources you want to import.

```hcl
# imports.tf

# If this configuration does not already declare the provider,
# add it so OpenTofu can generate configuration for imports.
provider "aws" {
  region = "us-east-1"
}

# Import an S3 bucket
import {
  id = "my-existing-bucket"
  to = aws_s3_bucket.main
}

# Import a VPC
import {
  id = "vpc-0abc12345def67890"
  to = aws_vpc.main
}

# Import a security group
import {
  id = "sg-0def12345abc67890"
  to = aws_security_group.app
}

# Import an RDS instance
import {
  id = "myapp-production-db"
  to = aws_db_instance.main
}
```

## Step 3: Auto-Generate HCL Configuration

Use `-generate-config-out` to have OpenTofu write the HCL for you.

```bash
# Initialize providers
tofu init

# Generate HCL configuration from import blocks
tofu plan -generate-config-out=generated.tf

# Review the generated configuration
cat generated.tf
```

```hcl
# Example generated.tf output
resource "aws_s3_bucket" "main" {
  bucket        = "my-existing-bucket"
  force_destroy = false
  # ... generated arguments based on the real resource
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  # ...
}
```

## Step 4: Clean Up Generated Configuration

The generated config is verbose - clean it up to keep only necessary attributes.

```hcl
# Before cleanup (verbose, generated)
resource "aws_s3_bucket" "main" {
  bucket              = "my-existing-bucket"
  bucket_domain_name  = "my-existing-bucket.s3.amazonaws.com"  # computed, remove
  bucket_regional_domain_name = "my-existing-bucket.s3.us-east-1.amazonaws.com"  # computed
  force_destroy       = false
  hosted_zone_id      = "Z3AQBSTGFYJSTF"  # computed, remove
  id                  = "my-existing-bucket"  # computed, remove
  region              = "us-east-1"  # may be computed
}

# After cleanup (lean)
resource "aws_s3_bucket" "main" {
  bucket = "my-existing-bucket"
}
```

## Step 5: Apply the Import

Run `tofu apply` to formally import resources into state.

```bash
# Review the plan once more
tofu plan  # should show only imports, no creates/destroys

# Apply the imports
tofu apply

# After successful import, you can remove the import blocks
# or leave them as a record of the resource's origin
```

## Step 6: Bulk Import with for_each

Import large numbers of similar resources efficiently.

```hcl
locals {
  existing_buckets = {
    logs     = "company-logs-bucket"
    backups  = "company-backups-bucket"
    archives = "company-archives-bucket"
    assets   = "company-assets-bucket"
  }
}

import {
  for_each = local.existing_buckets
  id       = each.value
  to       = aws_s3_bucket.existing[each.key]
}

resource "aws_s3_bucket" "existing" {
  for_each = local.existing_buckets
  bucket   = each.value
}
```

## Finding Import IDs

Different resources use different ID formats.

```javascript
Resource Type               ID Format
--------------------------------------------
aws_s3_bucket               bucket name
aws_vpc                     vpc-xxxxxxxxxxxxxxxxx
aws_security_group          sg-xxxxxxxxxxxxxxxxx
aws_db_instance             DB instance identifier
aws_iam_role                role name
aws_lambda_function         function name
azurerm_resource_group      /subscriptions/{sub}/resourceGroups/{name}
google_storage_bucket       project/bucket-name
```

## Summary

Importing existing cloud resources into OpenTofu involves discovering resources and their IDs, writing import blocks, using `-generate-config-out` to auto-generate HCL, cleaning up the generated configuration, and applying the imports. The key rule is: after import, `tofu plan` should show no changes. Any proposed changes indicate a mismatch between your HCL configuration and the real resource state that you should resolve before managing the resource going forward.
