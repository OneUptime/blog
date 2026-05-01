# How to Deprecate Output Values in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Output, Deprecation, Module Development, Infrastructure as Code, DevOps

Description: A guide to deprecating output values in OpenTofu modules to communicate breaking changes to consumers.

## Introduction

When maintaining OpenTofu modules, you may need to rename outputs, change their structure, or remove them entirely. The `deprecated` argument on module output blocks (added in OpenTofu 1.10) allows you to signal that an output is being phased out, giving consumers time to migrate.

## Declaring Deprecated Outputs

```hcl
# modules/vpc/outputs.tf

# OLD: Deprecated output

output "id" {
  description = "DEPRECATED: Use vpc_id instead"
  value       = aws_vpc.this.id
  deprecated  = "Use the 'vpc_id' output instead. The 'id' output will be removed in module version 2.0.0."
}

# NEW: Replacement output
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.this.id
}
```

## Deprecation Warning in Practice

When a consumer uses the deprecated output, OpenTofu shows a warning:

```bash
tofu plan

# Warning: Value derived from a deprecated source
#
#   on main.tf line 8, in resource "aws_security_group" "web":
#    8:   vpc_id = module.vpc.id
#
# This value is derived from module.vpc.id, which is deprecated with
# the following message:
#
# Use the 'vpc_id' output instead. The 'id' output will be removed in
# module version 2.0.0.
```

## Common Deprecation Patterns

### Renaming an Output

```hcl
# modules/compute/outputs.tf

# Old name (deprecated)
output "ip" {
  value      = aws_instance.this.public_ip
  deprecated = "Renamed to 'public_ip'. Update your references before module version 4.0."
}

# New name
output "public_ip" {
  description = "The public IP address of the instance"
  value       = aws_instance.this.public_ip
}
```

### Changing Output Structure

```hcl
# Old flat output (deprecated)
output "db_host" {
  value      = aws_db_instance.this.address
  deprecated = "Use 'database.host' from the new 'database' object output for all connection info."
}

output "db_port" {
  value      = aws_db_instance.this.port
  deprecated = "Use 'database.port' from the new 'database' object output."
}

# New consolidated output
output "database" {
  description = "Complete database connection information"
  value = {
    host     = aws_db_instance.this.address
    port     = aws_db_instance.this.port
    endpoint = aws_db_instance.this.endpoint
    name     = aws_db_instance.this.db_name
  }
}
```

### Removing an Unnecessary Output

```hcl
# modules/s3/outputs.tf

# Deprecated output being removed
output "bucket_hosted_zone_id" {
  value      = aws_s3_bucket.this.hosted_zone_id
  deprecated = <<-EOT
    This output was rarely used and is being removed.
    If you need the hosted zone ID for Route53, use the AWS provider data source:
      data "aws_s3_bucket" "this" {
        bucket = module.s3.bucket_name
      }
      # Then use data.aws_s3_bucket.this.hosted_zone_id
    This output will be removed in version 5.0.
  EOT
}

# Essential output kept
output "bucket_name" {
  description = "The name of the S3 bucket"
  value       = aws_s3_bucket.this.id
}
```

## Managing Module Versions with Deprecations

```hcl
# version.tf
terraform {
  required_version = ">= 1.10.0"
}

# CHANGELOG in the module repository:
# ## [2.0.0] - Upcoming (Breaking)
# - REMOVED: output `id` (deprecated since 1.5.0, use `vpc_id`)
# - REMOVED: output `db_host` (deprecated since 1.5.0, use `database.host`)
#
# ## [1.5.0] - 2025-01-01
# - DEPRECATED: output `id` - renamed to `vpc_id`
# - DEPRECATED: outputs `db_host`, `db_port` - merged into `database` object
# - ADDED: output `vpc_id` as replacement for `id`
# - ADDED: output `database` as replacement for `db_host` and `db_port`
```

## Consumer Migration Guide

```hcl
# BEFORE (using deprecated outputs)
module "vpc" {
  source = "my-org/vpc/aws"
  version = "~> 1.4"
}

resource "aws_security_group" "web" {
  vpc_id = module.vpc.id  # Using deprecated 'id' output
}

# AFTER (using new outputs)
module "vpc" {
  source = "my-org/vpc/aws"
  version = "~> 1.5"
}

resource "aws_security_group" "web" {
  vpc_id = module.vpc.vpc_id  # Using new 'vpc_id' output
}
```

## Conclusion

Deprecating outputs with clear migration messages allows module consumers to update at their own pace before breaking changes are introduced. The `deprecated` argument provides a standardized way to communicate these changes. Always include a clear migration path and version timeline in the deprecation message, and maintain the deprecated output until the major version removes it.
