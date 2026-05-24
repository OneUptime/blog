# Validation Summary: How to Delete Default Workspace Resources in Terraform

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Terraform (CLI workspace, state, destroy, import, plan commands)
- Terraform HCL configuration (locals, variables, null_resource, provisioners)
- AWS resources used as examples (aws_vpc, aws_subnet, aws_security_group, aws_instance)
- Bash scripting for automation

## Sources Consulted
- Terraform CLI workspace docs: https://developer.hashicorp.com/terraform/cli/workspaces
- `terraform state` command family: https://developer.hashicorp.com/terraform/cli/commands/state
- `terraform destroy` and `-target` semantics: https://developer.hashicorp.com/terraform/cli/commands/plan#resource-targeting
- `terraform import` CLI: https://developer.hashicorp.com/terraform/cli/commands/import
- `terraform.workspace` value and the `file()` validation hack: https://developer.hashicorp.com/terraform/language/state/workspaces
- Default workspace deletion behavior: confirmed `terraform workspace delete default` is rejected

## Issues Found

1. **Incorrect claim about `-target` destroy ordering (Step 3)** — The post originally claimed that `terraform destroy -target=aws_vpc.main` would fail because the VPC has dependencies. This is technically wrong: when you target a resource for destruction, Terraform automatically includes any resources that depend on it in the destruction plan and destroys them in the correct order. I rewrote the explanation to accurately describe this behavior, and reframed the multi-step `-target` example as the right approach when you want to destroy resources one at a time rather than as a way to avoid an error.

2. **Unquoted indexed resource addresses on the command line** — The original `terraform destroy -target=aws_subnet.public[0]` and `terraform import aws_subnet.public[0] subnet-...` examples leave the brackets unquoted, which can be interpreted by the shell as a glob character class. I added single quotes around the indexed addresses (e.g., `'aws_subnet.public[0]'`) and added a brief note explaining why.

## Review Notes
- The `file("ERROR: ...")` pattern used in Step 4 is a known, widely-used hack to trigger a configuration error. It still works, but in modern Terraform (1.2+) preconditions on resources/data sources and `check` blocks are a cleaner way to enforce workspace guards. Left as-is since the post is otherwise accurate and the hack remains a common pattern.
- `terraform import` CLI still works in current Terraform versions; the `import {}` block introduced in Terraform 1.5 is an alternative but not a replacement. No change needed.
- The `terraform plan -detailed-exitcode` flag in Step 5 returns exit code 0 (no changes), 1 (error), or 2 (changes present); pairing it with `set -e` in a loop would terminate on exit code 2, but the example loop does not use `set -e`, so it behaves as intended.
- The statement that the default workspace cannot be deleted is correct — `terraform workspace delete default` is explicitly rejected.
