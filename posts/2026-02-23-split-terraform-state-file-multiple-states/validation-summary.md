# Validation Summary: How to Split a Terraform State File into Multiple States

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform S3 backend
- Terraform `terraform_remote_state` data source
- AWS S3 state storage
- Shell scripting

## Sources Consulted
- Terraform `state mv` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- Terraform `state pull` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform `state push` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform `terraform_remote_state` data source documentation: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- Terraform state language documentation: https://developer.hashicorp.com/terraform/language/state

## Issues Found
- The `terraform state mv` examples only passed one resource address. The documented command requires both a source address and a destination address, even when the address is unchanged in the destination state. I added the destination address to each example and to the script.
- The S3 backend examples used `dynamodb_table`, which is deprecated for S3 backend locking in current Terraform documentation. I replaced it with `use_lockfile = true`.
- The workflow pushed the newly split state files but did not push the updated original state after moving resources out of the pulled local state file. I added a command to push the modified original state back to its backend.
- The dependency pitfall said Terraform would create a new security group after a moved security group was referenced from another configuration. I corrected this to say the plan can fail due to an undeclared reference, or create a duplicate only if the resource block is still present.

## Review Notes
The local environment did not have the `terraform` binary installed, so CLI behavior was verified against official HashiCorp documentation rather than local `terraform --help` output. The related OneUptime links in the post returned HTTP 200 during review.
