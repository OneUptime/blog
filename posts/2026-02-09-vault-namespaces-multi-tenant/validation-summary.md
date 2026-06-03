# Validation Summary: How to configure Vault namespaces for multi-tenant secret isolation

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- HashiCorp Vault Enterprise namespaces
- HashiCorp Vault CLI and ACL policies
- Vault Kubernetes auth method
- Vault Agent Injector for Kubernetes
- Vault KV v2, database, PKI, and transit secrets engines
- Vault audit devices, metrics, and resource quotas
- Kubernetes Deployments and service accounts
- Go Vault API client

## Sources Consulted
- HashiCorp Vault namespace and secure multi-tenancy documentation: https://developer.hashicorp.com/vault/docs/enterprise/namespaces
- HashiCorp Vault namespace CLI documentation: https://developer.hashicorp.com/vault/docs/commands/namespace
- HashiCorp Vault secrets enable CLI documentation: https://developer.hashicorp.com/vault/docs/commands/secrets/enable
- HashiCorp Vault KV v2 setup documentation: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2/setup
- HashiCorp Vault Kubernetes auth method API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault Agent Injector annotations documentation: https://developer.hashicorp.com/vault/docs/platform/k8s/injector/annotations
- HashiCorp Vault ACL policy documentation: https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault audit API and audit filtering documentation: https://developer.hashicorp.com/vault/api-docs/system/audit and https://developer.hashicorp.com/vault/docs/enterprise/audit/filtering
- HashiCorp Vault metrics API documentation: https://developer.hashicorp.com/vault/api-docs/system/metrics
- HashiCorp Vault rate limit and lease count quota documentation: https://developer.hashicorp.com/vault/api-docs/system/rate-limit-quotas and https://developer.hashicorp.com/vault/api-docs/system/lease-count-quotas
- HashiCorp Vault identity entity API documentation: https://developer.hashicorp.com/vault/api-docs/secret/identity/entity
- Go os package documentation for ReadFile: https://pkg.go.dev/os#ReadFile

## Issues Found
- The Kubernetes auth role example used the deprecated `policies` field and `ttl`, which is not the current documented role field. Changed these to `token_policies` and `token_ttl`.
- KV v2 ACL examples granted `list` on `data/` paths. KV v2 listing should be granted on `metadata/` paths, so the policies now separate read/create/update access on `data/` from list access on `metadata/`.
- The Go example did not compile because it used `log.Fatal` without importing `log`, used deprecated `ioutil.ReadFile`, and assigned `apiKey` without using it. Updated the imports, changed the read call to `os.ReadFile`, and marked the sample value as used.
- The team admin policy did not include the system mount paths needed to enable or manage auth methods and secrets engines. Added `sys/auth/*` and `sys/mounts/*` permissions with `sudo`.
- The monitoring example attempted to enable an audit device and read metrics while scoped to a child namespace. Current Vault system audit and metrics APIs are restricted to the root namespace, so the example now unsets `VAULT_NAMESPACE`, uses an audit filter for the tenant namespace, and reads metrics from root.
- The audit namespace filter used a namespace path without the required trailing slash. Updated the filter and `jq` example to use `team-a/production/`.
- The namespace inheritance wording was clarified so it does not imply that all child namespace resources automatically inherit from parents.

## Review Notes
The corrected audit filtering example depends on Vault Enterprise audit filtering support, documented for Vault 1.16 and later. The post does not pin a Vault version, so future readers should verify their deployed Vault Enterprise version before using filtered audit devices.
