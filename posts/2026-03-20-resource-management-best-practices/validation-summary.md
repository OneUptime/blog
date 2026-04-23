# Validation Summary: Resource Management Best Practices in OpenTofu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu
- Terraform/OpenTofu HCL
- AWS Provider for Terraform/OpenTofu
- AWS resources: VPC, S3, EC2, RDS/Aurora, Elastic Load Balancing target groups
- OpenTofu state backends and S3 state locking
- OpenTofu modules, lifecycle meta-arguments, moved blocks, targeting, count, and for_each

## Sources Consulted
- OpenTofu resource lifecycle documentation: https://opentofu.org/docs/language/resources/behavior/
- OpenTofu resource targeting documentation: https://opentofu.org/docs/cli/commands/plan/#resource-targeting
- OpenTofu destroy command documentation: https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu moved block/refactoring documentation: https://opentofu.org/docs/language/modules/develop/refactoring/
- OpenTofu module block/version documentation: https://opentofu.org/docs/language/modules/syntax/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu 1.8 early variable/locals evaluation notes: https://opentofu.org/docs/v1.8/intro/whats-new/#early-variablelocals-evaluation
- OpenTofu count meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/count/
- OpenTofu for_each meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/for_each/
- AWS provider default tags documentation/tutorial: https://developer.hashicorp.com/terraform/tutorials/aws/aws-default-tags
- AWS provider aws_rds_cluster documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- AWS provider aws_lb_target_group documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group

## Issues Found
- The post said manual changes can cause "state corruption." Manual changes to real infrastructure normally cause drift, not state corruption. Changed this to "state drift from manual changes."
- The S3 bucket naming example referenced `random_id.suffix.hex` without declaring the `random_id` resource. Added a minimal `random_id` resource with `byte_length = 4`.
- The AWS provider `default_tags` explanation said tags apply to all AWS resources. AWS provider documentation notes exceptions, including Auto Scaling Groups. Updated the wording to "supported taggable AWS resources" and called out separate tag handling for Auto Scaling Groups.
- The `aws_rds_cluster` lifecycle example omitted required current AWS provider arguments for creating a new Aurora PostgreSQL cluster. Added `database_name`, `master_username`, and `manage_master_user_password = true`.
- The `aws_lb_target_group` `create_before_destroy` example used a fixed `name`, which can conflict when old and replacement target groups must coexist. Replaced it with `name_prefix = "app-"` and kept the friendly name in tags.
- The targeting warning overstated the issue as state inconsistency. Updated it to match OpenTofu's documented risk: undetected drift and confusion about how state relates to configuration.
- The summary recommended `prevent_destroy` for "critical state," which was ambiguous. Clarified it as "critical state-storage resources."

## Review Notes
- The S3 backend example uses `var.environment` in the backend key. This is valid for current OpenTofu releases with early variable evaluation as long as the value is not derived from resources, data sources, or module outputs. It is not Terraform-compatible behavior.
- The `for_each` subnet example is syntactically valid, but future revisions could make it more robust by using an explicit map of stable subnet keys to CIDR blocks instead of deriving CIDRs from list indexes.
