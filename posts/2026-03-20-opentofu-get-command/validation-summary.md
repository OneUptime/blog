# Validation Summary: How to Use tofu get to Download Modules

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu CLI (`tofu get`, `tofu init`)
- Terraform / OpenTofu module sources (Git, Registry, local paths, S3, GCS, OCI)
- HCL module configuration syntax
- `.terraform/modules/modules.json` cache layout

## Sources Consulted
- OpenTofu `tofu get` command documentation: https://opentofu.org/docs/cli/commands/get/
- OpenTofu `tofu init` command documentation: https://opentofu.org/docs/cli/commands/init/
- OpenTofu module sources documentation: https://opentofu.org/docs/language/modules/sources/

## Issues Found
- **Invalid `-get-plugins=false` flag**: The CI/CD section showed `tofu init -input=false -get-plugins=false`. The `-get-plugins` flag does not exist in OpenTofu's `tofu init` (it was deprecated in Terraform 0.15 and not carried into OpenTofu). Replaced the snippet with a valid alternative that runs `tofu get -update` after a normal `tofu init`, which preserves the original intent of the example without using a non-existent flag.

## Review Notes
- The `-update`, `-no-color`, `-json`, `-var`, and `-var-file` flags listed in the official docs all match what the post implies; the post only uses `-update`, which is correct.
- The example output for `tofu get` (`Downloading git::... for module.networking...` / `- module.networking in .terraform/modules/networking`) matches the actual command's output format.
- The module sources list includes "OCI registries" — OCI module source support was added in recent OpenTofu releases, so this is accurate as of 2026 but is a relatively new capability worth being aware of for users on older OpenTofu versions.
- The note that `tofu get` with no modules "completes silently with no output" is approximately accurate; actual behavior is that it produces no module-download lines, though it may still emit a brief status message in some versions. Acceptable as written.
- The `cat ... | jq '.'` example is functional; `jq '.' .terraform/modules/modules.json` would be slightly more idiomatic but the cat-pipe form is widely used and not incorrect.
