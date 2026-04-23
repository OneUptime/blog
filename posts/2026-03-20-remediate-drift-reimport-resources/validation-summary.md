# Validation Summary: How to Remediate Drift by Re-Importing Resources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu state management
- OpenTofu `tofu import`
- OpenTofu `import` blocks
- OpenTofu configuration generation with `tofu plan -generate-config-out`
- AWS CLI
- AWS EC2
- AWS RDS
- AWS VPC
- Bash scripting

## Sources Consulted
- OpenTofu import block docs: https://opentofu.org/docs/language/import/
- OpenTofu generating configuration docs: https://opentofu.org/docs/v1.11/language/import/generating-configuration/
- OpenTofu `import` command docs: https://opentofu.org/docs/v1.10/cli/commands/import/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `refresh` command docs: https://opentofu.org/docs/v1.7/cli/commands/refresh/
- AWS CLI `ec2 describe-instances` docs: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS provider `aws_instance` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_db_instance` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- AWS provider `aws_vpc` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc

## Issues Found
- The post said declarative `import` blocks were available in OpenTofu 1.5+. OpenTofu documents `import` blocks in the 1.6 documentation set, so this was corrected to OpenTofu 1.6+.
- The imperative `tofu import` workflow omitted a required prerequisite: a matching `resource` block must already exist in configuration. I added that requirement directly to the example because OpenTofu imports into configuration-defined resource addresses.
- The declarative import section implied import blocks are strictly one-time and should be removed after apply. OpenTofu documents that they can either be removed or safely kept as a record, so that guidance was corrected.
- The configuration-generation section implied `tofu plan -generate-config-out` works by itself. OpenTofu generates configuration for resources targeted by an `import` block, so I added the missing `import` block example and the documented requirement that the output file path must be new.
- The bulk re-import script implied it could rebuild state from cloud inventory alone. `tofu import` still requires matching resource addresses in configuration, so I clarified that prerequisite and hardened the example to sanitize derived resource names and skip unusable or missing `Name` tags.
- The discrepancy-checking command used `tofu plan 2>&1 | grep -E "~|forces replacement"`, which can miss relevant planned actions and is not the documented review workflow. I replaced it with `tofu plan`.

## Review Notes
- The post is technically accurate after the above fixes.
- OpenTofu marks configuration-driven import and `-generate-config-out` behavior as experimental in the documentation, so future minor releases may refine that workflow.
- Command verification relied on official documentation rather than local `tofu --help` output because the OpenTofu CLI was not installed in this workspace.
