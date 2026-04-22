# Validation Summary: How to Configure S3 Backend with IAM Role Assumption in OpenTofu (2)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu
- Terraform/OpenTofu S3 backend configuration
- AWS IAM roles and trust policies
- AWS STS AssumeRole
- Amazon S3 remote state
- DynamoDB state locking
- AWS provider role assumption

## Sources Consulted
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- HashiCorp AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS CLI `sts assume-role` command reference: https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS STS `AssumeRole` API reference: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- AWS IAM session tags documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html

## Issues Found
- The S3 backend examples used deprecated top-level `role_arn`, `external_id`, and `session_name` arguments. Updated them to the current `assume_role = { ... }` backend argument.
- The basic backend example used `session_name = "OpenTofu-Backend-${var.environment}"`, but backend blocks cannot refer to input variables. Replaced it with a static session name.
- The DynamoDB locking IAM policy omitted `dynamodb:DescribeTable`, which OpenTofu documents as required for DynamoDB state locking. Added it to the policy action list.
- The role chaining note implied AWS STS handled the chain automatically and omitted the one-hour chained-session limit. Reworded the comments to explain that OpenTofu calls STS with the current credentials and that chained sessions are limited to one hour.
- The "Session Tags for Audit" section showed a session name, not session tags. Renamed it to "Session Names for Audit" and updated the backend snippet to use `assume_role.session_name`.
- The duration configuration used `role_session_name`, which is not a valid OpenTofu S3 backend argument, and did not configure duration. Replaced it with `assume_role.duration` and `assume_role.session_name`.
- The manual `aws sts assume-role` troubleshooting command omitted the external ID required by the trust policy example. Added `--external-id` and clarified that `AccessDenied` can also mean the caller lacks permission to call `sts:AssumeRole`.

## Review Notes
- OpenTofu now also supports native S3 locking with `use_lockfile`, while DynamoDB locking remains supported.
- Placeholder AWS account IDs and role names in the examples must be replaced with real account IDs and deployed roles.
- Neither `tofu` nor `terraform` was installed locally, so syntax validation was performed by documentation review and manual HCL inspection rather than by running `tofu fmt` or `terraform validate`.
