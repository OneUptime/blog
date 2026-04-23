# Validation Summary: How to Roll Back State Encryption in OpenTofu - Rollback

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu state and plan encryption
- OpenTofu CLI
- HCL configuration
- AWS S3 and AWS CLI
- Python JSON validation

## Sources Consulted
- OpenTofu State and Plan Encryption: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu apply command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu state list command: https://opentofu.org/docs/cli/commands/state/list/
- OpenTofu state push command: https://opentofu.org/docs/cli/commands/state/push/
- OpenTofu Sensitive Data in State: https://opentofu.org/docs/language/state/sensitive-data/
- AWS CLI list-object-versions: https://docs.aws.amazon.com/cli/latest/reference/s3api/list-object-versions.html
- AWS CLI get-object: https://docs.aws.amazon.com/cli/latest/reference/s3api/get-object.html
- AWS CLI s3 cp: https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html
- Python json.tool documentation: https://docs.python.org/3/library/json.html#module-json.tool

## Issues Found
- The rollback HCL snippets relied on omitting `method` to write unencrypted state. Current OpenTofu documentation shows the rollback path using an explicit `method "unencrypted" "migrate" {}` and setting `method = method.unencrypted.migrate` while keeping the old encrypted method as `fallback`. Updated both rollback snippets to use the documented unencrypted migration method.
- The introduction grouped key loss with normal rollback, but OpenTofu cannot decrypt encrypted state without the correct key. Updated the wording to distinguish normal rollback with the current key from recovery using a pre-encryption backup.
- The apply comments said OpenTofu writes back state with "no method set." Updated the comments to say it writes with the unencrypted migration method.
- The emergency recovery section used `tofu state push` without noting encryption configuration removal or the state push safety checks. Added guidance to remove the encryption block before pushing recovered unencrypted state and noted that `-force` may be needed only after confirming the older recovered state should overwrite the remote state.

## Review Notes
The OpenTofu and AWS CLI commands are valid according to current documentation. `tofu` and `aws` were not installed locally in this workspace, so command behavior was verified against official documentation rather than executed locally.
