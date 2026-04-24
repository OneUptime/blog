# Validation Summary: How to Handle Provisioner Failures with on_failure in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu provisioners (`local-exec`, `remote-exec`)
- OpenTofu CLI (`tofu show`, `tofu state show`, `tofu untaint`)
- HCL
- `jq`

## Sources Consulted
- OpenTofu provisioners documentation: https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu `remote-exec` provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu `show` command documentation: https://opentofu.org/docs/cli/commands/show/
- OpenTofu `state show` command documentation: https://opentofu.org/docs/cli/commands/state/show/
- OpenTofu `untaint` command documentation: https://opentofu.org/docs/cli/commands/untaint/
- OpenTofu JSON output format documentation: https://opentofu.org/docs/internals/json-format/

## Issues Found
- The post recommended parsing `tofu state show` output with `grep` to detect tainted resources. The official `state show` documentation says that output is intended for human consumption, not programmatic consumption, and directs users to `tofu show -json` for machine-readable state inspection. I replaced that example with a documented `tofu show -state -json` plus `jq` approach that reads the `tainted` field from the JSON state representation.
- The destroy-time explanation said `on_failure = continue` would “ensure cleanup always proceeds.” I tightened that wording to say it lets destruction proceed even if the provisioner fails, which is the behavior documented by OpenTofu.

## Review Notes
- OpenTofu documents provisioners as a last resort. The post’s main guidance is accurate, but readers should still prefer provider-native features or cloud-init/user data when possible.
- Destroy-time provisioners have additional caveats in the official docs: they do not run when `create_before_destroy = true`, they must still be present in configuration at destroy time, and they do not run for already-tainted resources. These are useful edge cases to keep in mind for future revisions.
