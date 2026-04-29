# Validation Summary: How to Migrate Terraform State to OpenTofu

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- OpenTofu (CLI: `tofu`)
- Terraform (CLI: `terraform`)
- HCL configuration language
- Terraform/OpenTofu state file format (version 4)
- S3 + DynamoDB remote backend
- `.terraform.lock.hcl` (provider lock file)
- Provider registries (`registry.opentofu.org`, `registry.terraform.io`)
- Homebrew (macOS install)
- jq (state inspection)

## Sources Consulted
- OpenTofu installation docs: https://opentofu.org/docs/intro/install/
- OpenTofu standalone installer docs: https://opentofu.org/docs/intro/install/standalone-installer/
- OpenTofu install script source: https://get.opentofu.org/install-opentofu.sh (inspected directly)
- OpenTofu JSON format docs: https://opentofu.org/docs/internals/json-format/
- OpenTofu Homebrew formula (`brew install opentofu`)
- General knowledge of Terraform/OpenTofu state file format (`.tfstate` schema version 4 vs `.terraform/terraform.tfstate` backend metadata schema version 3)

## Issues Found

1. **Linux install command was incorrect.** The post used `curl -fsSL https://get.opentofu.org/install-opentofu.sh | sh`, but the official `install-opentofu.sh` script requires the `--install-method` flag (e.g. `standalone`, `deb`, `rpm`, `snap`). Without it, the script exits with `TOFU_INSTALL_EXIT_CODE_INVALID_ARGUMENT`. Replaced with the canonical three-line invocation from the OpenTofu docs:
   ```bash
   curl --proto '=https' --tlsv1.2 -fsSL https://get.opentofu.org/install-opentofu.sh -o install-opentofu.sh
   chmod +x install-opentofu.sh
   ./install-opentofu.sh --install-method standalone
   ```

2. **Wrong path for inspecting state version.** The post advised `cat .terraform/terraform.tfstate | jq '.version'` to verify the state format is version 4. But `.terraform/terraform.tfstate` is the local *backend configuration metadata* file (its `.version` field is the backend-config schema, typically `3`), not the actual state. With the S3 remote backend used in the post, the real state is not stored at that path at all. Replaced with `tofu state pull | jq '.version'`, which fetches the actual state from whichever backend is configured and reports the true state format version (4).

## Review Notes
- The state-file format compatibility claim is correct: OpenTofu was forked from Terraform 1.5.x and continues to read/write the same `.tfstate` schema (version 4), and rolling back to Terraform from an OpenTofu-modified state works for now. Note that OpenTofu and Terraform are diverging over time (e.g. OpenTofu's `encrypted_state` and provider-iteration features); state written using OpenTofu-only features may not round-trip back to Terraform forever. Worth flagging in a future revision if the rollback section is kept.
- The default registry change to `registry.opentofu.org` and the ability to override per-provider with `registry.terraform.io/...` source addresses are accurate.
- Regenerating `.terraform.lock.hcl` after switching CLIs is the documented recommendation, since the lock file pins provider checksums and the OpenTofu registry serves binaries with different signatures than HashiCorp's.
- The Homebrew formula `opentofu` is correct.
- The migration checklist is rendered inside an ```hcl``` fenced code block; it is plain text, not HCL. Not a technical error, just a minor cosmetic syntax-highlighting choice — left as-is per the "only fix technical errors" instruction.
