# How to Use for_each with Import Blocks in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use for_each with import blocks in OpenTofu 1.7+ to batch-import multiple existing resources in a single, DRY configuration block.

## Introduction

OpenTofu 1.7 added `for_each` support to import blocks. This allows you to import multiple existing resources with a single import block, using the same iteration mechanism as `resource` and `module` blocks. Import blocks are still marked experimental in the OpenTofu documentation. It's ideal for batch-importing resources of the same type.

## Basic for_each Import

```hcl
# Import multiple EC2 instances at once

locals {
  existing_instances = {
    "web-1" = "i-0123456789abcdef0"
    "web-2" = "i-abcdef01234567890"
    "web-3" = "i-fedcba98765432100"
  }
}

import {
  for_each = local.existing_instances
  to       = aws_instance.web[each.key]
  id       = each.value
}

resource "aws_instance" "web" {
  for_each      = local.existing_instances

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}
```

## Importing Multiple S3 Buckets

```hcl
locals {
  existing_buckets = {
    "assets"    = "company-assets-prod"
    "logs"      = "company-logs-prod"
    "backups"   = "company-backups-prod"
  }
}

import {
  for_each = local.existing_buckets
  to       = aws_s3_bucket.main[each.key]
  id       = each.value
}

resource "aws_s3_bucket" "main" {
  for_each = local.existing_buckets
  bucket   = each.value
}
```

## Importing Count-Based Resources

```hcl
locals {
  # Each list index maps to an instance ID
  instance_ids = [
    "i-0123456789abcdef0",
    "i-abcdef01234567890",
    "i-11111111111111111",
  ]
}

import {
  for_each = {
    for idx, instance_id in local.instance_ids : idx => instance_id
  }
  to       = aws_instance.web[tonumber(each.key)]
  id       = each.value
}

resource "aws_instance" "web" {
  count         = length(local.instance_ids)
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}
```

## Complex Import Scenarios

### Import IAM Roles

```hcl
locals {
  existing_roles = {
    "app-service"   = "arn:aws:iam::123456789012:role/app-service-role"
    "data-pipeline" = "arn:aws:iam::123456789012:role/data-pipeline-role"
  }
}

import {
  for_each = local.existing_roles
  to       = aws_iam_role.service[each.key]
  id       = split("role/", each.value)[1]  # IAM role name from ARN
}

resource "aws_iam_role" "service" {
  for_each = local.existing_roles

  name = split("role/", each.value)[1]
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}
```

### Import Route53 Records

```hcl
locals {
  dns_records = {
    "api" = {
      zone_id = "Z1PA6795UKMFR9"
      name    = "api.example.com"
      type    = "A"
      ttl     = 300
      records = ["192.0.2.10"]
    }
    "www" = {
      zone_id = "Z1PA6795UKMFR9"
      name    = "www.example.com"
      type    = "A"
      ttl     = 300
      records = ["192.0.2.11"]
    }
  }
}

import {
  for_each = local.dns_records
  to       = aws_route53_record.main[each.key]
  # Route53 import ID format: zone_id_record_name_record_type
  id       = "${each.value.zone_id}_${each.value.name}_${each.value.type}"
}

resource "aws_route53_record" "main" {
  for_each = local.dns_records

  zone_id = each.value.zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = each.value.ttl
  records = each.value.records
}
```

## Verification

After applying all imports:

```bash
tofu plan
# If the resource blocks match the imported infrastructure,
# this should show no changes.

tofu state list | grep aws_instance.web
# aws_instance.web["web-1"]
# aws_instance.web["web-2"]
# aws_instance.web["web-3"]
```

## Conclusion

`for_each` in import blocks dramatically simplifies bulk imports. Instead of writing one import block per resource, you can import dozens of resources with a single, DRY configuration block. This is especially valuable when adopting IaC for existing large-scale deployments. After import, always verify with `tofu plan` and remove the import blocks once they're no longer needed, or keep them as a record of the resource's origin.
