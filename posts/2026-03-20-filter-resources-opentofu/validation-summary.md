# Validation Summary: How to Filter Resources and Collections in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider data sources for Terraform/OpenTofu
- AWS EC2 and VPC filtering patterns

## Sources Consulted
- OpenTofu `for` expressions: https://opentofu.org/docs/language/expressions/for/
- OpenTofu `can` function: https://opentofu.org/docs/language/functions/can/
- OpenTofu `try` function: https://opentofu.org/docs/language/functions/try/
- Terraform/HashiCorp data source reference: https://developer.hashicorp.com/terraform/language/data-sources
- AWS provider `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS provider `aws_vpcs` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpcs
- AWS provider `aws_subnets` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets
- AWS provider `aws_instances` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/instances

## Issues Found
- The `aws_instance.service` example referenced `data.aws_ami.latest.id`, but the only AMI data source defined in the post is `data.aws_ami.amazon_linux`. I changed the reference to `data.aws_ami.amazon_linux.id` so the example is internally consistent and valid.
- The post presented `can()` as the preferred way to handle optional attributes while filtering in `locals`. Current OpenTofu documentation recommends `can()` mainly for validation-style checks and prefers `try()` elsewhere. I updated the description, introduction, section heading, example, and conclusion to use `try(config.extra_disk != null, false)` for this case.
- The introduction and conclusion implied that `filter` blocks are a generic OpenTofu language feature. I clarified that these filters are provider-specific data source arguments.

## Review Notes
- The AWS data source examples are compatible with current provider documentation. In particular, the `aws_ami` example includes `owners = ["amazon"]`, which remains important for safe `most_recent = true` lookups in current AWS provider versions.
- I was not able to run `tofu console` locally in this workspace because the `tofu` binary is not installed, so validation relied on the official OpenTofu and AWS provider documentation rather than local execution.
