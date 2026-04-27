# Validation Summary: How to Configure Encryption for Remote State Data Sources in OpenTofu (2)

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTofu (state encryption, `terraform_remote_state` data source)
- Terraform configuration language (HCL)
- AWS KMS (key provider)
- PBKDF2 (passphrase-based key provider)
- AES-GCM (encryption method)

## Sources Consulted
- OpenTofu State Encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu `terraform_remote_state` data source documentation
- OpenTofu key providers (`aws_kms`, `pbkdf2`) and methods (`aes_gcm`) reference

## Issues Found

1. **Per-Source Encryption Configuration block — wrong block name.** The post used `source "data.terraform_remote_state.networking" { ... }` to declare per-source overrides. The correct block name in OpenTofu is `remote_state_data_source` (singular). Updated the two blocks to use `remote_state_data_source`.

2. **Per-Source Encryption Configuration — wrong source name format.** The post used the full reference form `data.terraform_remote_state.networking` / `data.terraform_remote_state.database` as the source label. Per OpenTofu docs, the label is the data source's local name only (optionally prefixed by module path). Changed to `"networking"` and `"database"`.

3. **`enforced` attribute on `remote_state_data_sources.default`.** The post showed `enforced = false` inside the `default` block in the PBKDF2 example. The `enforced` attribute is documented for the top-level `state` and `plan` blocks within `encryption`, but not for `remote_state_data_sources` entries. Removed the `enforced` line (and its comment) to avoid producing an invalid configuration.

## Review Notes
- The `aws_eks_cluster` example resource is intentionally minimal and omits required fields like `name` and `role_arn`; this is acceptable since the snippet is illustrating the consumption of a remote state output rather than a complete EKS resource definition.
- The `terraform { encryption { ... } }` top-level block, the `aes_gcm` method's `keys` attribute, and the `pbkdf2` provider's `passphrase` attribute are all correct as written.
- Output access via `data.terraform_remote_state.networking.outputs.private_subnet_ids` matches the standard OpenTofu/Terraform reference syntax.
