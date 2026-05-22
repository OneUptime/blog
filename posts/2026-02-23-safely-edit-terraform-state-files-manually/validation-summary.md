# Validation Summary: How to Safely Edit Terraform State Files Manually

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state files
- Terraform remote backends
- State locking
- JSON
- jq

## Sources Consulted
- Terraform state overview: https://developer.hashicorp.com/terraform/language/state
- Terraform state commands reference: https://developer.hashicorp.com/terraform/cli/commands/state
- `terraform state pull` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- `terraform state push` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/push
- Terraform state storage and locking: https://developer.hashicorp.com/terraform/language/state/backends
- Terraform state locking: https://developer.hashicorp.com/terraform/language/state/locking
- `terraform force-unlock` command reference: https://developer.hashicorp.com/terraform/cli/commands/force-unlock
- `terraform state mv` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- `terraform state rm` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/rm
- `terraform state replace-provider` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/replace-provider
- `terraform state show` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/show
- `terraform import` command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- `terraform plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- S3 backend locking reference: https://developer.hashicorp.com/terraform/language/backend/s3

## Issues Found
- Several code blocks were labeled as JSON but contained `//` comments. JSON does not allow comments, and the post later recommends validating the edited state with JSON tooling. I removed the inline comments and moved one instruction into prose so the examples remain syntactically valid JSON.
- The restore example recommended directly pushing the original backup after a bad manual edit. After a modified state has already been pushed, the backup's serial may be lower than the remote serial, so Terraform can reject the push unless the restore copy's serial is incremented or `-force` is used. I changed the restore flow to copy the backup, increment the restore serial, and push that file, with a separate warning for `terraform state push -force`.
- The locking section suggested using `terraform force-unlock` to work around lock conflicts. Official Terraform documentation says force-unlock should be used only for a stuck lock, and only for your own lock. I corrected the guidance to prefer coordination or a maintenance window and narrowed the example to stuck-lock recovery.
- The S3 locking example referenced DynamoDB. Current Terraform documentation marks DynamoDB-based S3 locking as deprecated and recommends S3 lockfiles via `use_lockfile`. I removed the backend-specific example and kept the statement generic.

## Review Notes
- The post correctly emphasizes that manual state editing is dangerous and should be a last resort.
- Terraform CLI was not installed in the local environment, so command behavior was verified against official HashiCorp documentation rather than local `terraform -help` output.
