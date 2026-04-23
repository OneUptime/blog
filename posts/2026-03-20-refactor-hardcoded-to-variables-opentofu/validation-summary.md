# Validation Summary: How to Refactor Hardcoded Values to Variables in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS EC2 (`aws_instance`)
- OpenTofu input variables
- OpenTofu local values
- `.tfvars` variable definition files

## Sources Consulted
- OpenTofu Docs: Input Variables — https://opentofu.org/docs/language/values/variables/
- OpenTofu Docs: Local Values — https://opentofu.org/docs/language/values/locals/
- OpenTofu Docs: `can` Function — https://opentofu.org/docs/language/functions/can/
- OpenTofu Docs: `regex` Function — https://opentofu.org/docs/language/functions/regex/
- OpenTofu Docs: `regexall` Function — https://opentofu.org/docs/language/functions/regexall/
- OpenTofu Docs: `tofu apply` Command — https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform Registry: `aws_instance` Resource — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS EC2 User Guide: Spot Instance Request Launch Specifications Examples — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-request-examples.html

## Issues Found
- The post referenced `var.owner` in the final `aws_instance` example without declaring an `owner` input variable or supplying a value for it. I added an `owner` variable with a default so the refactored example is internally consistent and valid.
- Several `subnet_id` example values used invalid-looking AWS subnet ID strings such as `subnet-12345`, `subnet-dev-12345`, and `subnet-prod-67890`. I replaced them with AWS-style placeholder subnet IDs so the examples reflect real identifier shapes.
- The `instance_type` validation example only checked a partial prefix with `can(regex(...))`, while the error message claimed it validated a full EC2 instance type. I changed it to a full-string shape check with `regexall(...)` and adjusted the error message to match what the validation actually enforces.

## Review Notes
- The post is otherwise technically sound. The explanation of using `locals` first, then promoting selected values to input variables, is consistent with OpenTofu's language model.
- The `tofu apply -var-file="production.tfvars"` example is correct. OpenTofu also supports auto-loaded files such as `terraform.tfvars` and `*.auto.tfvars`, but the post's explicit `-var-file` usage is accurate.
- The AMI IDs in the examples are illustrative. In practice, AMI IDs are region-specific, so readers still need to provide an AMI that exists in their target region and account.
- A local execution check was not possible in this workspace because the `tofu` CLI is not installed, so validation was performed against the official documentation rather than by running the examples locally.
