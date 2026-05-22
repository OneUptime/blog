# Validation Summary: How to Troubleshoot terraform state mv Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform resource addresses
- Terraform moved blocks
- Shell scripting

## Sources Consulted
- HashiCorp Terraform CLI command reference: `terraform state mv` - https://developer.hashicorp.com/terraform/cli/commands/state/mv
- HashiCorp Terraform resource address reference - https://developer.hashicorp.com/terraform/cli/state/resource-addressing
- HashiCorp Terraform state commands reference - https://developer.hashicorp.com/terraform/cli/commands/state
- HashiCorp Terraform refactoring and `moved` blocks documentation - https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform CLI command reference: `terraform state push` - https://developer.hashicorp.com/terraform/cli/commands/state/push
- HashiCorp Terraform CLI command reference: `terraform force-unlock` - https://developer.hashicorp.com/terraform/cli/commands/force-unlock

## Issues Found
- The indexed-address example incorrectly said that moving a specific instance to a non-indexed address is invalid, while Terraform documents that moving between indexed and non-indexed addresses can be valid when the destination configuration matches. Updated the example to focus on address syntax, shell quoting, and valid indexed/non-indexed moves.
- The module example showed a `resource` block nested inside a `module` block in a commented HCL snippet. Terraform resources are declared inside the child module's own files, not inside the calling `module` block. Updated the snippet to show `modules/web_server/main.tf`.
- The cross-state example implied `-state-out` could be used directly with remote destination state and did not mention updating a remote source state after a local-copy move. Updated the section to distinguish local state files from remote backend local-copy workflows.
- The recovery script used `BACKUP_FILE=$1` with `set -u`, which exits before the usage check when no argument is supplied. Changed it to `BACKUP_FILE="${1:-}"`.

## Review Notes
- Terraform was not installed in the local workspace, so CLI behavior was checked against current HashiCorp official documentation rather than local `terraform -help` output.
- The post correctly recommends `moved` blocks for Terraform 1.1 and later, but teams should retain historical `moved` blocks in reusable modules when preserving upgrade paths for older consumers.
