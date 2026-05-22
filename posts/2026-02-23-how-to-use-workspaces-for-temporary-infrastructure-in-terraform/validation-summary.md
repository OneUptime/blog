# Validation Summary: How to Use Workspaces for Temporary Infrastructure in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI workspaces
- Terraform HCL
- Terraform AWS provider
- AWS EC2
- AWS RDS
- AWS Budgets
- AWS cost allocation tags
- Slack incoming webhooks
- Bash scripting

## Sources Consulted
- Terraform CLI workspace overview: https://developer.hashicorp.com/terraform/cli/workspaces
- Terraform workspace state documentation: https://docs.hashicorp.com/terraform/language/state/workspaces
- Terraform workspace select command: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform workspace delete command: https://developer.hashicorp.com/terraform/cli/commands/workspace/delete
- Terraform timestamp function: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Terraform timeadd function: https://developer.hashicorp.com/terraform/language/functions/timeadd
- Terraform lifecycle meta-argument: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform AWS provider aws_instance resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform AWS provider aws_spot_instance_request resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/spot_instance_request
- Terraform AWS provider aws_db_instance resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider aws_budgets_budget resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- AWS Budgets budget filters: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create-filters.html
- AWS user-defined cost allocation tag activation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html
- Slack incoming webhooks documentation: https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks

## Issues Found
- The initial cleanup command selected a `dev` workspace before deleting the temporary workspace. Terraform requires switching away from the workspace being deleted, but `dev` is not guaranteed to exist. Changed it to `terraform workspace select default`, because every Terraform working directory starts with a non-deletable `default` workspace.
- The shared tag example used `timeadd(timestamp(), ...)` for `ExpireAfter`. Terraform documents that `timestamp()` changes continually and can cause diffs when used directly in resource attributes. Changed the example to use a supplied `expires_at` variable and updated the demo creation script to pass a fixed RFC3339 expiration timestamp.
- The load generator example used `aws_spot_instance_request`. The current AWS provider documentation notes that AWS strongly discourages the legacy APIs behind that resource and recommends `aws_instance` with `instance_market_options` instead. Updated the example to use `aws_instance` spot market options.
- The AWS Budgets section omitted the requirement to activate user-defined cost allocation tags before using them in budget filters. Added a short note that `Temporary` must be activated as a user-defined cost allocation tag.

## Review Notes
- Terraform was not installed in the local environment, so CLI behavior was verified against official Terraform documentation rather than local `terraform --help` output.
- The snippets are illustrative and still assume surrounding Terraform configuration exists, including providers, variables, AMI data sources, networking resources, credentials, and outputs.
