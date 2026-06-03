# Validation Summary: How to Use Vault KV v2 Secrets Engine with Kubernetes Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault KV v2 secrets engine
- Vault CLI and policies
- Vault Kubernetes auth
- Vault Agent Injector
- External Secrets Operator
- Kubernetes SecretStore, ExternalSecret, Deployment, ConfigMap, and CronJob manifests
- Go Vault API client
- Prometheus alert rules

## Sources Consulted
- HashiCorp Vault KV v2 documentation: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- HashiCorp Vault KV CLI documentation: https://developer.hashicorp.com/vault/docs/commands/kv
- HashiCorp Vault KV v2 HTTP API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- HashiCorp Vault KV rollback command documentation: https://developer.hashicorp.com/vault/docs/commands/kv/rollback
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Agent Injector examples: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/examples
- External Secrets Operator HashiCorp Vault provider documentation: https://external-secrets.io/v0.10.0/provider/hashicorp-vault/
- HashiCorp Vault secrets telemetry metrics: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/secrets
- Go Vault API package documentation: https://pkg.go.dev/github.com/hashicorp/vault/api

## Issues Found
- Corrected the KV v2 enablement comment to clarify that `vault secrets enable -version=2 kv` mounts at the default `kv/` path, not `secret/`.
- Corrected `delete_version_after` wording. Vault uses it to set soft deletion timing for versions; it does not permanently destroy version data by itself.
- Clarified that the write examples use the KV CLI path form, since the CLI inserts the KV v2 API path components automatically.
- Fixed the Vault Agent Injector example so the ConfigMap is actually referenced through `vault.hashicorp.com/agent-configmap`, uses the documented `config.hcl` key, and does not manually define the injector-managed `/vault/secrets` volume.
- Corrected the Go example to pass the KV v2 `version` read parameter with `ReadWithData` and hardened the metadata type assertion before using it.
- Reworked the policy example to describe separate application, operator, and auditor policies, and added KV v2 version-management paths for delete, undelete, and destroy operations.
- Fixed the rotation CronJob by using the current `hashicorp/vault` image naming pattern, defining `OLD_PASSWORD` before using it, and updating the database before writing the new Vault secret version.
- Corrected the Prometheus example to use Vault's documented KV entry count telemetry instead of an unsupported version-count metric and `version="v2"` label.
- Updated the best-practices cleanup wording to distinguish soft deletion from permanent destruction and storage control.

## Review Notes
The External Secrets Operator example remains version-sensitive because ESO releases may evolve CRD versions and provider fields over time. The reviewed `v1beta1` SecretStore and ExternalSecret fields match the official Vault provider documentation consulted during validation.
