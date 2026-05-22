# Validation Summary: How to Optimize Terraform State Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state and remote backends
- Terraform AWS provider
- Terraform Google provider
- AWS S3 backend locking
- GitHub Actions

## Sources Consulted
- Terraform `plan` command documentation: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `apply` command documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform refresh command documentation: https://developer.hashicorp.com/terraform/cli/commands/refresh
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform remote state documentation: https://developer.hashicorp.com/terraform/language/state/remote
- HCP Terraform remote operations documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/run/remote-operations
- AWS provider configuration reference: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Google provider configuration reference: https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference.html
- GitHub Actions cache action documentation: https://github.com/actions/cache
- GitHub Actions artifact v3 deprecation notice: https://github.blog/changelog/2024-04-16-deprecation-notice-v3-of-the-artifact-actions/

## Issues Found
- The post recommended routine use of `-target` for component work. Terraform documents targeting as an exceptional option and warns against routine use because it can hide drift. Updated the section to describe recovery/workaround use and mention dependency inclusion and routine-use risks.
- The AWS provider example recommended `skip_requesting_account_id = true` as a performance optimization. Official AWS provider docs describe it as useful for AWS-compatible APIs that lack IAM, STS, or metadata APIs, and it can leave account IDs empty for some ARN construction. Removed it from the general AWS provider example.
- The AWS `default_tags` comment claimed reduced per-resource API overhead. `default_tags` is for consistent provider-level tagging, not an API-call reduction. Updated the comment.
- The Google provider batching comment was too broad. Official docs state batching applies only to specific request types, such as `google_project_service` and IAM resources. Updated the comment.
- The `for_each` section implied a resource-count optimization. `for_each` still creates separate state instances. Updated the heading and comment to frame it as organization rather than state-entry reduction.
- The security group example recommended inline security group rules as "better". The current AWS provider guidance recommends avoiding inline rules and using current `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` resources with one CIDR block per rule. Replaced the recommendation with current ingress rule resources.
- The S3 backend example used deprecated DynamoDB locking and deprecated `force_path_style`. Updated it to S3 native lock files with `use_lockfile = true` and removed `force_path_style`.
- The CI section described caching Terraform state locally, but the example caches `.terraform`, which contains working-directory data such as providers/modules rather than remote state. Renamed the section and step to providers/modules.
- The GitHub Actions artifact examples used `actions/upload-artifact@v3` and `actions/download-artifact@v3`, which are no longer supported on GitHub.com. Updated them to `@v4`. Updated `actions/cache` to `@v4` as a current supported version.
- The skipped-refresh saved-plan example could be read as safe for all applies. Added a caveat that this is only appropriate if external drift is not possible.

## Review Notes
Terraform was not installed in the local environment, so CLI flags and behavior were verified against official HashiCorp documentation rather than local `terraform --help` output. The logging/grep examples are best-effort diagnostics because Terraform log formats are not a stable API; they may need adjustment for specific Terraform/provider versions.
