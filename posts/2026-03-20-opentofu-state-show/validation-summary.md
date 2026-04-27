# Validation Summary: Using tofu state show in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform state management
- AWS provider resources (aws_instance, aws_vpc, aws_db_instance, aws_eks_cluster, aws_security_group, aws_s3_bucket)
- Bash / shell scripting (grep, jq)

## Sources Consulted
- OpenTofu `state show` command docs: https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu `show` command docs: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `refresh` command docs: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu JSON output format: https://opentofu.org/docs/internals/json-format/
- OpenTofu resource addressing: https://opentofu.org/docs/internals/resource-addressing/
- Terraform AWS provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
1. **Invalid AWS resource type `aws_rds_instance`** (lines 74–75). The Terraform AWS provider does not define a resource named `aws_rds_instance`; the resource for an RDS database instance is `aws_db_instance`. Fixed by renaming both occurrences in the "Specifying State File" section to `aws_db_instance.db`, matching the resource type already used correctly elsewhere in the post (e.g., `aws_db_instance.main` in the "Getting Resource IDs for Other Tools" section).

## Review Notes
- `tofu refresh` is still functional but is officially **deprecated** in current OpenTofu, with the docs recommending `tofu apply -refresh-only` instead. The post's usage to update state to match real infrastructure is technically accurate, but a future revision could mention the recommended alternative.
- `tofu state show` does not have a `-json` flag; the post correctly directs readers to `tofu show -json` for machine-readable output.
- The `tofu show -json` structure (`.values.root_module.resources[]` with `.address` and `.values` fields) is correct for the state representation.
- `count` (`[0]`) and `for_each` (`["key"]`) resource addressing is shown correctly, matching the official addressing reference.
- The `-state=PATH` flag for `tofu state show` is documented and functional, though the docs note it is ignored when remote state is in use — not a correctness issue, just a caveat worth keeping in mind.
