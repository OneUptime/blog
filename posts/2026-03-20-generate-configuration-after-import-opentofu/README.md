# How to Generate Configuration After Import in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Import, Config Generation, Generate-config-out, HCL

Description: Learn how to use OpenTofu's -generate-config-out flag to automatically generate HCL configuration from imported resources, accelerating the migration of existing infrastructure to code.

## Introduction

Writing HCL to match existing resources before importing is tedious and error-prone. OpenTofu's experimental `-generate-config-out` flag generates HCL from `import` blocks automatically, providing a starting point that you refine rather than write from scratch. These examples assume the working directory already has provider configuration for the resources you're importing; if it doesn't, add a `provider` block and run `tofu init` before generating configuration.

## Basic Usage

```hcl
# Step 1: Write just the import blocks (no resource config needed yet)
# Assumes provider configuration for AWS already exists in this working directory.

# imports.tf
import {
  to = aws_vpc.main
  id = "vpc-0123456789abcdef0"
}

import {
  to = aws_subnet.public_a
  id = "subnet-0123456789abcdef0"
}

import {
  to = aws_security_group.app
  id = "sg-0123456789abcdef0"
}
```

```bash
# Step 2: Generate HCL configuration into a new file
tofu plan -generate-config-out=generated_resources.tf

# The output path must not already exist.
# This writes generated_resources.tf with HCL for imported resources
```

## Understanding Generated Output

The generated file contains resource blocks you can use as a starting point:

```hcl
# generated_resources.tf (auto-generated starting point)
resource "aws_vpc" "main" {
  assign_generated_ipv6_cidr_block     = false
  cidr_block                           = "10.0.0.0/16"
  enable_dns_hostnames                 = true
  enable_dns_support                   = true
  enable_network_address_usage_metrics = false
  instance_tenancy                     = "default"
  tags = {
    "Name"        = "prod-vpc"
    "Environment" = "prod"
  }
}
```

## Cleaning Up Generated Configuration

The generated config can include arguments you'd remove or simplify after review, including provider defaults. Clean it up:

```hcl
# Before cleanup (generated):
resource "aws_vpc" "main" {
  assign_generated_ipv6_cidr_block     = false   # Remove - this is the default
  cidr_block                           = "10.0.0.0/16"
  enable_dns_hostnames                 = true
  enable_dns_support                   = true
  enable_network_address_usage_metrics = false   # Remove - this is the default
  instance_tenancy                     = "default"  # Remove - this is the default
  tags = {
    "Name"        = "prod-vpc"
    "Environment" = "prod"
  }
}

# After cleanup (curated):
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  tags = {
    Name        = "prod-vpc"
    Environment = "prod"
  }
}
```

## Complete Import Workflow with Config Generation

```bash
#!/bin/bash
# complete_import_workflow.sh
# Prerequisite: provider configuration already exists and tofu init has already been run.

echo "Step 1: Write import blocks"
cat > imports.tf << 'EOF'
import {
  to = aws_vpc.main
  id = "vpc-0123456789abcdef0"
}

import {
  to = aws_internet_gateway.main
  id = "igw-0123456789abcdef0"
}
EOF

echo "Step 2: Generate configuration"
tofu plan -generate-config-out=generated.tf

echo "Step 3: Review generated config"
cat generated.tf

echo "Step 4: Apply the import"
# After reviewing and cleaning up generated.tf:
tofu apply

echo "Step 5: Remove import blocks (they're no longer needed)"
rm imports.tf

echo "Step 6: Verify clean state"
tofu plan
# Should show: No changes. Infrastructure is up-to-date.
```

## Handling for_each Imports with Generated Config

```hcl
# If your target resource uses for_each, write the resource block yourself first.
# OpenTofu does not currently generate configuration when for_each is used on import blocks.
import {
  to = aws_subnet.private["us-east-1a"]
  id = "subnet-abc"
}

import {
  to = aws_subnet.private["us-east-1b"]
  id = "subnet-def"
}
```

## Limitations and Caveats

```hcl
# Generated config may include sensitive values in plaintext
# Review and remove or parameterize them before committing to version control

# Also check for deprecated attributes in generated config
# The generator uses the current provider schema, so generated output is only a starting point

# The plan preview during config generation may show computed attributes
# Do not copy them into your curated HCL
resource "aws_vpc" "main" {
  # Example computed attributes you may see in plan output:
  # arn                 = "arn:aws:ec2:us-east-1:123:vpc/vpc-abc"
  # id                  = "vpc-0123456789abcdef0"
  # main_route_table_id = "rtb-abc"

  # Keep only configuration arguments in curated HCL:
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
}
```

## Conclusion

The experimental `-generate-config-out` feature transforms import from a "write-then-verify" workflow to a "generate-then-refine" workflow. Use it for bulk imports to get a first pass of the HCL written automatically, then spend your time cleaning up defaults and restructuring for reuse. Always review the generated config and the plan preview before committing.
