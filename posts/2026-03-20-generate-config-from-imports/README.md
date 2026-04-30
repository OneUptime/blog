# How to Generate Configuration from Imported Resources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use OpenTofu's -generate-config-out flag to automatically generate HCL configuration for imported resources, accelerating brownfield adoption.

## Introduction

OpenTofu 1.6 introduced the `-generate-config-out` flag for `tofu plan` as an experimental feature. When used with import blocks, it generates HCL resource configuration based on OpenTofu's best guess for the imported resource's arguments. This dramatically speeds up brownfield infrastructure adoption - you don't need to manually write every resource configuration.

## Basic Usage

### Step 1: Write Only the Import Block

```hcl
# imports.tf - no resource block required here

import {
  to = aws_vpc.main
  id = "vpc-0a1b2c3d4e5f6789"
}

import {
  to = aws_instance.web
  id = "i-0123456789abcdef0"
}
```

You still need your normal provider configuration elsewhere in the configuration if it is not already present.

### Step 2: Generate Configuration

```bash
# Generate HCL configuration for all imported resources; the output file must not already exist
tofu plan -generate-config-out=generated.tf

# Output:
# aws_vpc.main: Preparing import... [id=vpc-0a1b2c3d4e5f6789]
# ...
# Warning: Config generation is experimental
# ...
# OpenTofu has generated configuration and written it to generated.tf.
```

### Step 3: Review and Clean Up Generated Configuration

The generated file (`generated.tf`) contains OpenTofu's best guess for the resource arguments, often including more attributes than you want to keep long-term:

```hcl
# generated.tf (auto-generated, needs cleanup)
resource "aws_vpc" "main" {
  assign_generated_ipv6_cidr_block     = false
  cidr_block                           = "10.0.0.0/16"
  enable_dns_hostnames                 = true
  enable_dns_support                   = true
  instance_tenancy                     = "default"
  ipv4_ipam_pool_id                    = null
  ipv4_netmask_length                  = null
  tags = {
    "Environment" = "production"
    "Name"        = "main-vpc"
    "ManagedBy"   = "terraform"
  }
}
```

Clean up the generated configuration:

```hcl
# cleaned-up resources.tf
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Environment = "production"
    Name        = "main-vpc"
    ManagedBy   = "opentofu"
  }
}
```

### Step 4: Apply the Import

```bash
tofu apply
# aws_vpc.main: Importing... [id=vpc-0a1b2c3d4e5f6789]
# aws_vpc.main: Import complete [id=vpc-0a1b2c3d4e5f6789]
# aws_instance.web: Importing... [id=i-0123456789abcdef0]
# aws_instance.web: Import complete [id=i-0123456789abcdef0]
# Apply complete! Resources: 2 imported, 0 added, 0 changed, 0 destroyed.
```

### Step 5: Verify and Remove Import Blocks

```bash
tofu plan
# No changes. Your infrastructure matches the configuration.
```

You can remove the import blocks from `imports.tf`, or leave them in place as a record of the resources' origin.

## Generated Config for Complex Resources

For complex resources like EKS clusters:

```hcl
# imports.tf
import {
  to = aws_eks_cluster.main
  id = "my-eks-cluster"
}
```

```bash
tofu plan -generate-config-out=eks-generated.tf
# Can generate a large amount of configuration for complex resources, including nested blocks when supported by the provider schema
```

## Batch Imports with for_each

```hcl
locals {
  buckets = {
    "assets"  = "company-assets"
    "logs"    = "company-logs"
  }
}

resource "aws_s3_bucket" "main" {
  for_each = local.buckets
  bucket   = each.value
}

import {
  for_each = local.buckets
  to       = aws_s3_bucket.main[each.key]
  id       = each.value
}
```

```bash
# Preview the batch imports; configuration generation is not supported with for_each
tofu plan
```

## Limitations

- Config generation is still experimental
- The file passed to `-generate-config-out` must not already exist
- Generating configuration is currently not supported when using `for_each` on `import` blocks
- Generated config may include more arguments than you want to keep
- Some complex resources can require manual fixes after generation
- Review and simplify the generated config before committing

## Conclusion

The `-generate-config-out` flag eliminates the most tedious part of brownfield IaC adoption - manually writing resource configurations for every existing resource. Use it to bootstrap your OpenTofu configurations, then clean up the generated code to remove unnecessary attributes, improve readability, and ensure the configuration reflects your desired state rather than just the current state.
