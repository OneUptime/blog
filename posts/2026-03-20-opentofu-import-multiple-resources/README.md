# How to Import Multiple Resources at Once in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Import

Description: Learn how to import many existing infrastructure resources into OpenTofu simultaneously using multiple import blocks and for_each patterns.

## Introduction

Adopting OpenTofu for existing infrastructure often means importing dozens or hundreds of resources. Import blocks support batch importing - you can define many import blocks in a single file and apply them all at once. Combined with `for_each` on import blocks, you can import entire resource families in a single declaration.

## Multiple Import Blocks in One File

```hcl
# imports.tf

# Import VPC

import {
  to = aws_vpc.main
  id = "vpc-0abc123456"
}

# Import subnets
import {
  to = aws_subnet.public_a
  id = "subnet-0abc111"
}

import {
  to = aws_subnet.public_b
  id = "subnet-0abc222"
}

# Import security group
import {
  to = aws_security_group.web
  id = "sg-0abc789"
}

# Import EC2 instance
import {
  to = aws_instance.web
  id = "i-0abc123def456"
}
```

```bash
tofu plan
# Plan: 5 to import, 0 to add, 0 to change, 0 to destroy.

tofu apply
# Imports all 5 resources simultaneously
```

## Batch Import with for_each

```hcl
# Import 20 S3 buckets at once using a map
locals {
  buckets = {
    "app-data"    = "acme-app-data-prod"
    "app-logs"    = "acme-app-logs-prod"
    "app-backups" = "acme-app-backups-prod"
    "ml-datasets" = "acme-ml-datasets-prod"
    # ... more entries
  }
}

import {
  for_each = local.buckets
  to       = aws_s3_bucket.managed[each.key]
  id       = each.value
}

resource "aws_s3_bucket" "managed" {
  for_each = local.buckets
  bucket   = each.value
}
```

## Organizing Imports by Service

```hcl
# networking-imports.tf
import {
  to = aws_vpc.main
  id = "vpc-0abc"
}

import {
  to = aws_internet_gateway.main
  id = "igw-0abc"
}

import {
  to = aws_route_table.public
  id = "rtb-0abc"
}

# compute-imports.tf
import {
  to = aws_instance.web[0]
  id = "i-0abc001"
}

import {
  to = aws_instance.web[1]
  id = "i-0abc002"
}

import {
  to = aws_instance.web[2]
  id = "i-0abc003"
}

# iam-imports.tf
import {
  to = aws_iam_role.app_server
  id = "AppServerRole"
}

import {
  to = aws_iam_role.worker
  id = "WorkerRole"
}
```

## Using a CSV or JSON Data Source for Import IDs

```hcl
# Load import IDs from a JSON file
locals {
  import_data = jsondecode(file("${path.module}/resources-to-import.json"))
}

import {
  for_each = local.import_data.instances
  to       = aws_instance.managed[each.key]
  id       = each.value.instance_id
}
```

```json
// resources-to-import.json
{
  "instances": {
    "web-1": {"instance_id": "i-0abc001"},
    "web-2": {"instance_id": "i-0abc002"},
    "web-3": {"instance_id": "i-0abc003"}
  }
}
```

## Import and Generate Configuration Together

```bash
# For many resources, generate configuration for all at once
tofu plan -generate-config-out=all-generated.tf

# This generates configuration for every import block
# Review, clean up, split into appropriate files
```

## Phased Import Strategy

For very large imports, import in phases to manage risk:

```bash
# Phase 1: networking (foundation)
tofu apply -target=aws_vpc.main -target=aws_internet_gateway.main -target=aws_route_table.public

# Phase 2: security groups (depend on networking)
tofu apply -target=aws_security_group.web -target=aws_security_group.db

# Phase 3: compute (depend on networking + security)
tofu apply -target=aws_instance.web -target=aws_instance.worker
```

## Verify Imports

```bash
# After all imports, verify everything is in state
tofu state list | wc -l   # Count managed resources

# Run plan to check for any configuration mismatches
tofu plan
# Ideally: "No changes. Infrastructure is up-to-date."
# If not, update configurations until there are no changes
```

## Conclusion

Batch importing with multiple import blocks or `for_each` on import blocks is the most efficient way to bring existing infrastructure under OpenTofu management. Organize imports by service or layer, use `for_each` for families of similar resources, and use JSON data files when import IDs are maintained externally. After importing, run `tofu plan` and reconcile any attribute differences between your configuration and the actual resource state.
