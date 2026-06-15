# Validation Summary: How to Use Terraform Workspaces for Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform configuration language (HCL)
- Terraform S3 backend
- Terraform lifecycle preconditions
- Terraform built-in `terraform_data` resource
- AWS provider resources for EC2, S3, ELB, Auto Scaling, and RDS
- `terraform-aws-modules/vpc/aws`
- Terragrunt

## Sources Consulted
- HashiCorp Terraform CLI workspace documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace
- HashiCorp Terraform workspace overview: https://developer.hashicorp.com/terraform/language/state/workspaces
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- HashiCorp Terraform lifecycle precondition documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle#precondition
- HashiCorp Terraform `terraform_data` resource documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- HashiCorp AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- HashiCorp AWS provider `aws_launch_template` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template
- HashiCorp AWS provider `aws_lb_target_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- HashiCorp AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- `terraform-aws-modules/vpc/aws` module documentation: https://registry.terraform.io/modules/terraform-aws-modules/vpc/aws/latest
- Terragrunt documentation: https://terragrunt.gruntwork.io/docs/

## Issues Found
- The S3 backend examples used `dynamodb_table` for state locking. Terraform's S3 backend documentation now marks DynamoDB-based locking as deprecated and recommends S3 lockfile-based locking. Changed both backend snippets to use `use_lockfile = true`.
- The workspace validation example used `count = terraform.workspace == "default" ? "ERROR: Do not use default workspace" : 0`, which is not a valid way to block a Terraform run because `count` expects a number. Replaced it with a built-in `terraform_data` resource and a lifecycle `precondition`, which blocks planning with a clear error message when the default workspace is selected.
- The text introducing the workspace validation example said it prevented accidental production deploys, but the check prevents use of the default workspace. Updated the sentence to match the code.

## Review Notes
- Terraform was not installed in the local environment, so examples were reviewed against official documentation rather than validated with `terraform validate`.
- The larger AWS example is structurally plausible, but it is intentionally incomplete for a production deployment: it omits items such as explicit security groups, an ALB listener, IAM instance profile, and module/provider version constraints.
