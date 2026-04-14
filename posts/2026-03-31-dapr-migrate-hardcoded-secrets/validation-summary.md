# Validation Summary: How to Migrate from Hardcoded Secrets to Dapr Secret Stores

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Dapr Secrets Management API
- Dapr secret store components (Kubernetes, HashiCorp Vault)
- Kubernetes (Secrets, ConfigMaps, Deployments)
- Python with httpx
- kubectl CLI
- jq

## Sources Consulted
- Dapr Secrets API Reference — https://docs.dapr.io/reference/api/secrets_api/
- Dapr Kubernetes Secret Store component — https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/
- Dapr HashiCorp Vault Secret Store component — https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr Component Schema — https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Sidecar documentation (default port 3500) — https://docs.dapr.io/concepts/dapr-services/sidecar/

## Issues Found

### 1. Mismatch between Kubernetes Secret name and Dapr API URL path (Steps 2-4)

**What was wrong:** The Dapr component in Step 2 was named `app-secrets`, which is the same name as the Kubernetes Secret object created in Step 3 (`kubectl create secret generic app-secrets ...`). In Step 4, the Python code called `GET /v1.0/secrets/app-secrets/db-password`. For the Kubernetes secret store, the URL path after the component name must be the **Kubernetes Secret object name**, not a key within it. This URL would look for a K8s Secret object literally named `db-password`, which does not exist. The actual K8s Secret is named `app-secrets` and contains keys `db-password` and `api-key`.

**What was changed:**
1. Renamed the Dapr component from `app-secrets` to `secret-store` in the Kubernetes component YAML (Step 2) to disambiguate it from the K8s Secret object.
2. Updated the Python API URL in Step 4 from `http://localhost:3500/v1.0/secrets/app-secrets/db-password` to `http://localhost:3500/v1.0/secrets/secret-store/app-secrets`. This correctly targets the `secret-store` Dapr component and fetches the K8s Secret named `app-secrets`.
3. The response parsing `resp.json()["db-password"]` remains correct — the Kubernetes secret store returns all key-value pairs from the K8s Secret as a flat JSON object.

**Why:** The Dapr Kubernetes secret store maps the `{secret-name}` path parameter to a Kubernetes Secret object name. The response is a JSON object containing all data keys from that Secret. Using the wrong name would result in a 500 or 404 error at runtime.

## Review Notes
- The HashiCorp Vault component example uses correct metadata field names (`vaultAddr` and `vaultTokenMountPath`). Note that one of `vaultToken` or `vaultTokenMountPath` is required for authentication.
- The `apiVersion: dapr.io/v1alpha1` and `version: v1` values are correct and current for Dapr components.
- The Dapr sidecar default HTTP port 3500 is correct.
- All kubectl commands use valid syntax and flags.
- The `daprd` sidecar container name in the `kubectl logs` command is correct.
- The Python httpx usage is syntactically correct and idiomatic.
