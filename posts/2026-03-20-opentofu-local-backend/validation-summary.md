# Validation Summary: How to Configure the Local Backend in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (local backend, workspaces, state migration)
- Terraform-compatible HCL configuration syntax
- AWS S3 backend (briefly, in the migration example)

## Sources Consulted
- OpenTofu local backend docs: https://opentofu.org/docs/language/settings/backends/local/
- OpenTofu backend configuration docs (variables/locals support): https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu workspaces docs: https://opentofu.org/docs/cli/workspaces/
- OpenTofu `tofu init` docs: https://opentofu.org/docs/cli/commands/init/

## Issues Found

1. **Incorrect "no locking" claim.** The Limitations section originally stated `**No locking**: concurrent runs can corrupt state`. This is wrong — per the official local backend docs, OpenTofu's local backend "locks that state using system APIs." The actual limitation is that this lock only protects against concurrent runs on the same machine; it cannot coordinate across multiple machines or users. Updated the bullet to reflect this nuance accurately.

2. **`-state` flag described without legacy caveat.** The post showed `tofu plan -state=...` and `tofu apply -state=...` without noting that the OpenTofu docs explicitly classify `-state`, `-state-out`, and `-backup` as *legacy* options preserved only for backward compatibility with the local backend, and that the docs say "We do not recommend using these options in new systems." Added a one-sentence preface noting the legacy status so readers do not adopt this for new workflows.

## Review Notes

- The `path = "environments/${var.environment}/terraform.tfstate"` example using a variable inside the backend block is **valid in OpenTofu** (a deliberate divergence from upstream Terraform, which forbids this). The variable must be resolvable at `tofu init` time. This was initially flagged as a likely error during review but verified correct against https://opentofu.org/docs/language/settings/backends/configuration/.
- Workspace state path convention `terraform.tfstate.d/<workspace>/terraform.tfstate` is confirmed correct.
- `tofu init -migrate-state` is the correct flag for backend migration.
- `terraform.tfstate.backup` as the default backup filename is long-standing convention inherited from Terraform and still produced by OpenTofu, though the local backend docs page itself describes only the `-backup=FILENAME` override rather than naming the default. Leaving as-is since the claim is accurate in practice.
- The post does not pin a specific OpenTofu version. All checked behavior is current as of OpenTofu 1.x docs at review time.
