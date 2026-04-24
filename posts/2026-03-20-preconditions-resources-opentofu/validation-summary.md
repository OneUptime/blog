# Validation Summary: How to Add Preconditions to Resources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Configuration Language (HCL)
- AWS provider resources and data sources
- Amazon S3 bucket naming rules
- Amazon RDS storage configuration

## Sources Consulted
- OpenTofu custom conditions: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu `plantimestamp` function: https://opentofu.org/docs/language/functions/plantimestamp/
- OpenTofu `timestamp` function: https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu `timeadd` function: https://opentofu.org/docs/language/functions/timeadd/
- OpenTofu `timecmp` function: https://opentofu.org/docs/language/functions/timecmp/
- OpenTofu `cidrcontains` function: https://opentofu.org/docs/language/functions/cidrcontains/
- OpenTofu `can` function: https://opentofu.org/docs/language/functions/can/
- AWS provider `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_s3_bucket` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket
- Amazon S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html
- Amazon RDS DB instance storage: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html

## Issues Found
- The section titled "Preconditions on Data Sources" did not actually place conditions on a data source. I renamed it to "Preconditions That Reference Data Sources" so the example matches what the code is doing.
- The AMI age check used `timestamp()`, which OpenTofu evaluates only during apply because its value is not predictable during planning. I changed it to `plantimestamp()`, which OpenTofu documents specifically for time-sensitive custom conditions.
- The subnet example claimed to verify that a subnet CIDR was within the VPC CIDR, but `cidrsubnet(var.vpc_cidr, 8, 0) != var.subnet_cidr` only checked that the subnet was not equal to one specific derived subnet. I replaced it with `cidrcontains(aws_vpc.main.cidr_block, var.subnet_cidr)` and updated the error message.
- The RDS Multi-AZ precondition checked `var.db_multi_az` without assigning that value to the `aws_db_instance` resource. I added `multi_az = var.db_multi_az` so the validation now matches the resource configuration being applied.
- The S3 bucket example said bucket names must not contain consecutive dots or hyphens. AWS bucket naming rules disallow adjacent periods, but consecutive hyphens are allowed. I updated the condition, comment, and error message to reject consecutive dots only.
- The post said variable validation runs during parsing and contrasted it with preconditions in a way that no longer matches current OpenTofu documentation. I corrected the inline explanation and rewrote the conclusion so it distinguishes input validation from resource-level conditions accurately.

## Review Notes
- The examples are concept-focused snippets rather than complete standalone modules, so some referenced variables and data sources are assumed to be declared elsewhere.
- The examples using `can()` are syntactically valid, but OpenTofu documentation recommends `can()` primarily for validation rules and generally prefers `try()` for broader error handling.
