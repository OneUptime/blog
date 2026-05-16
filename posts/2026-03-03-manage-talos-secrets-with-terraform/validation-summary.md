# Validation Summary: How to Manage Talos Secrets with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (cluster secrets, machine configuration, CA/PKI, bootstrap tokens, encryption keys)
- Terraform (state backends, sensitive outputs, lifecycle/replace_triggered_by)
- siderolabs/talos Terraform provider (talos_machine_secrets, talos_machine_configuration, talos_client_configuration, talos_cluster_kubeconfig)
- Remote state backends: AWS S3 + DynamoDB + KMS, Azure azurerm, GCS
- External secret stores: AWS Secrets Manager, HashiCorp Vault
- talosctl CLI (apply-config, health)
- AWS IAM / S3 bucket policy

## Sources Consulted
- siderolabs/talos provider docs — talos_machine_secrets resource: https://github.com/siderolabs/terraform-provider-talos/blob/main/docs/resources/machine_secrets.md
- siderolabs/talos provider docs — talos_machine_configuration data source: https://github.com/siderolabs/terraform-provider-talos/blob/main/docs/data-sources/machine_configuration.md
- siderolabs/talos provider docs — talos_client_configuration data source: https://github.com/siderolabs/terraform-provider-talos/blob/main/docs/data-sources/client_configuration.md
- siderolabs/talos provider docs — talos_cluster_kubeconfig resource: https://github.com/siderolabs/terraform-provider-talos/blob/main/docs/resources/cluster_kubeconfig.md
- siderolabs/talos provider releases (current 0.11.0): https://github.com/siderolabs/terraform-provider-talos/releases
- siderolabs/talos releases (current Talos Linux v1.13.0): https://github.com/siderolabs/talos/releases
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Sibling posts in this blog (`create-talos-clusters-with-terraform`, `use-the-talos-terraform-provider`) cross-checked for consistent provider/Talos version pinning.

## Issues Found
1. **Outdated Terraform provider version constraint.** The post pinned `version = "~> 0.5"` for the `siderolabs/talos` provider. The current provider series is `0.11.x` and this is what sibling posts in the blog use. Updated to `~> 0.11.0` so readers using the example will get the same provider behavior documented elsewhere on this blog.
2. **Outdated `talos_version` contract.** Both `talos_machine_secrets` blocks used `talos_version = "v1.7.0"` (an April 2024 release). Current Talos Linux is `v1.13.0`, and sibling posts standardize on `v1.12.6`. Updated both occurrences (the initial example and the lifecycle example) to `v1.12.6` for consistency and to reflect a supported contract version per the provider docs (which give `v1.12` as an example).

## Review Notes
- Resource/data source names and arguments (`talos_machine_secrets`, `talos_machine_configuration`, `talos_client_configuration`, `talos_cluster_kubeconfig`) and their attributes (`machine_secrets`, `client_configuration`, `talos_config`, `kubeconfig_raw`) all match the official provider docs.
- The S3 backend block uses the legacy `dynamodb_table` lock argument, which still works but is being superseded by S3 native locking (`use_lockfile = true`) in newer Terraform versions. The example as written is still valid and widely deployed; no change made because it is not incorrect.
- `talosctl health --wait-timeout` was verified to exist (it is present in v1.7 docs and via known issue tracking, though it has been dropped from the visible v1.13 CLI reference page). Behavior of this flag has had reported issues for values >5 minutes; the post's `5m` value sits at the edge but matches common usage in other tutorials in this blog. Left as-is.
- The "Secret Rotation" section is correctly conservative — it shows how to wire a `replace_triggered_by` trigger and notes that all node configurations need to be re-applied. It does not explicitly warn that recreating `talos_machine_secrets` regenerates the cluster CAs (which is effectively a new cluster identity, not a true rolling rotation of existing trust). Not a technical error in the code shown, but readers should be aware that full secret regeneration is closer to a cluster rebuild than a rolling cert rotation.
- The `aws_secretsmanager_secret_version` / `vault_kv_secret_v2` examples `jsonencode` the nested `machine_secrets` and `client_configuration` objects directly. This is valid Terraform (jsonencode handles complex types) and produces a JSON blob containing all the certs and keys; it is the intended use.
