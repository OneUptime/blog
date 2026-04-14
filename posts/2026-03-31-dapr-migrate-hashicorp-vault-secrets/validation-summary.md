# Validation Summary: How to Migrate from HashiCorp Vault Direct Usage to Dapr Secrets

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Dapr Secrets Management API
- HashiCorp Vault (KV v2 secrets engine)
- hvac Python library (HashiCorp Vault client)
- Dapr Python SDK (`dapr-client`)
- Dapr secret store components
- Dapr secret scoping (Configuration resource)
- Kubernetes service account auth with Vault

## Sources Consulted
- Dapr HashiCorp Vault secret store component docs: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr secret scoping docs: https://docs.dapr.io/operations/configuration/secret-scope/
- Dapr Configuration schema: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Python SDK source (GitHub): https://github.com/dapr/python-sdk — `dapr/clients/grpc/client.py` and `dapr/clients/grpc/_response.py`
- hvac Python library source (v2.4.0): https://github.com/hvac/hvac — `hvac/api/secrets_engines/kv_v2.py`
- hvac documentation: https://hvac.readthedocs.io/

## Issues Found

### 1. Missing `import os` in the "Before" code example
- **What was wrong:** The code used `os.environ['VAULT_TOKEN']` but only imported `hvac`, missing the `import os` statement. This would raise a `NameError` at runtime.
- **What was changed:** Added `import os` on the line after the comment and before `import hvac`.

### 2. Fabricated `vaultKubernetesRole` metadata field in Vault Kubernetes Auth section
- **What was wrong:** The "Vault Kubernetes Auth" YAML snippet included a `vaultKubernetesRole` metadata field that does not exist in the Dapr HashiCorp Vault secret store component. The Dapr Vault component only supports token-based authentication (via `vaultToken` or `vaultTokenMountPath`). It does not natively perform Vault's Kubernetes auth login exchange. Additionally, pointing `vaultTokenMountPath` at the raw Kubernetes service account token path (`/var/run/secrets/kubernetes.io/serviceaccount/token`) is incorrect because a Kubernetes service account JWT is not a Vault token.
- **What was changed:** Rewrote the section to describe the correct pattern: use a Vault Agent sidecar or init container to perform the Kubernetes auth login, write the resulting Vault token to a file (e.g., `/vault/secrets/token`), and point `vaultTokenMountPath` at that file. Removed the non-existent `vaultKubernetesRole` field from the YAML.

## Review Notes
- The hvac `read_secret_version()` method triggers a `DeprecationWarning` in hvac v2.4.0+ when `raise_on_deleted_version` is not explicitly passed, as the default is changing in hvac v3.0.0. This is minor and does not affect correctness.
- All Dapr Python SDK API calls (`get_secret`, `get_bulk_secret`, `.secret`, `.secrets`) are verified correct against the SDK source.
- The first Dapr Vault component YAML (main configuration) has all correct metadata field names: `vaultAddr`, `vaultToken`, `vaultKVPrefix`, `vaultKVUsePrefix`, `enginePath`, `vaultTokenMountPath`.
- The secret scoping Configuration resource format is correct per official Dapr docs.
