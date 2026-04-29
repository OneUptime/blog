# Validation Summary: How to Use Lifecycle Customizations with Data Sources in OpenTofu - Opentofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider data sources
- OpenTofu lifecycle customizations and custom conditions

## Sources Consulted
- OpenTofu Data Sources documentation: https://opentofu.org/docs/language/data-sources/
- OpenTofu Custom Conditions documentation: https://opentofu.org/docs/language/expressions/custom-conditions/
- OpenTofu `plantimestamp` function documentation: https://opentofu.org/docs/language/functions/plantimestamp/
- AWS provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS provider `aws_vpc` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc
- AWS provider `aws_eks_cluster` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_cluster
- AWS provider `aws_secretsmanager_secret_version` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- AWS provider `aws_s3_bucket_objects` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/s3_bucket_objects
- AWS provider `aws_s3_objects` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/s3_objects
- AWS provider `aws_iam_role` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_role
- AWS provider `aws_subnets` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets

## Issues Found
- The introduction said data source lifecycle blocks only support `precondition` and `postcondition`. I corrected this to match current OpenTofu documentation, which also supports `enabled` for data resources, while keeping the note that `ignore_changes` and `prevent_destroy` do not apply to data sources.
- The VPC CIDR postcondition comment claimed it verified an expected CIDR range, but the expression only checked whether the CIDR block was valid. I updated the comment to match the code.
- The EKS version check used a naive `major >= 1 && minor >= 28` comparison, which would incorrectly reject future `2.x` versions. I rewrote it to correctly enforce a minimum version of `1.28`.
- The secret validation comment said it checked for a JSON object, but the expression only checked for valid JSON. I corrected the comment to match the actual validation.
- The AMI ownership example referenced `data.aws_caller_identity.current.account_id` without declaring that data source. I replaced it with `owners = ["self"]`, which is a supported and equivalent way to scope AMI ownership to the current AWS account.
- The AMI age check used `timestamp()`, which is evaluated during apply. I changed it to `plantimestamp()` so the example aligns better with plan-time validation for data-source checks.
- The read-order section used the deprecated `aws_s3_bucket_objects` data source and described `depends_on` as generic refresh control. I replaced it with `aws_s3_objects` and updated the explanation to match OpenTofu's documented data-source read behavior.
- The conclusion overstated that custom conditions are caught in the plan phase. I revised it to reflect OpenTofu's documented behavior: conditions are evaluated as early as possible and may be deferred to apply when values are unknown.

## Review Notes
- Current OpenTofu documentation shows that data source lifecycle customizations include `enabled`, `precondition`, and `postcondition`. Older OpenTofu versions documented different behavior, so version context matters if this post is later retargeted to a specific historical release.
