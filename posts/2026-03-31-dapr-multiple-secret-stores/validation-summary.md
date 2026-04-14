# Validation Summary: How to Configure Multiple Secret Stores in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Secrets API
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Kubernetes Secrets (`secretstores.kubernetes`)
- HashiCorp Vault (`secretstores.hashicorp.vault`)
- AWS Secrets Manager (`secretstores.aws.secretmanager`)
- PostgreSQL state store component (`state.postgresql`)

## Sources Consulted
- Dapr Secrets API Reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Kubernetes Secret Store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/
- Dapr HashiCorp Vault Secret Store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr AWS Secrets Manager: https://docs.dapr.io/reference/components-reference/supported-secret-stores/aws-secret-manager/
- Dapr Component Secrets: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Component Schema: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Go SDK source (GetSecret): https://github.com/dapr/go-sdk/blob/main/client/secret.go

## Issues Found

### 1. Incorrect Vault metadata field name (`vaultMountPath` -> `enginePath`)
- **What was wrong:** The Vault component YAML used `vaultMountPath` with value `"secret/data"`. There is no `vaultMountPath` metadata field in the Dapr HashiCorp Vault secret store component. The correct field for specifying the secrets engine mount path is `enginePath`. Additionally, the value `"secret/data"` is incorrect — the `/data` segment is handled internally by the Dapr Vault v2 KV engine; the correct value is just `"secret"`.
- **What was changed:** Renamed the metadata field from `vaultMountPath` to `enginePath` and changed the value from `"secret/data"` to `"secret"`.

### 2. Incorrect placement of `auth.secretStore` field
- **What was wrong:** The "Referencing Multiple Stores in Components" section showed `auth.secretStore` nested under `spec`. In Dapr's component schema, `auth` is a root-level field (sibling to `metadata` and `spec`), not a child of `spec`.
- **What was changed:** Moved `auth.secretStore` from `spec.auth.secretStore` to root-level `auth.secretStore`, placing it after the `spec` block as a peer field.

### 3. Missing `fmt` import in Go code
- **What was wrong:** The `loadSecrets` function in the "Using Multiple Stores in Go" section used `fmt.Errorf` but the import block only included `"context"` and the Dapr client package. This would cause a compilation error.
- **What was changed:** Added `"fmt"` to the import block.

## Review Notes
- The second Go code snippet (`getSecretWithFallback`) uses both `fmt.Errorf` and `log.Printf` without showing imports. Since it's presented as a standalone function snippet (not a full file with `package` declaration), this is acceptable — readers would understand they need to import `fmt` and `log`.
- The secrets API endpoint format (`/v1.0/secrets/{store-name}/{secret-name}`) is correct and current.
- All three secret store component type names (`secretstores.kubernetes`, `secretstores.hashicorp.vault`, `secretstores.aws.secretmanager`) are correct.
- The Dapr Go SDK `GetSecret` function signature matches the current SDK API.
- The AWS Secrets Manager metadata fields (`region`, `accessKey`, `secretKey`) are all correct.
- The component API version `dapr.io/v1alpha1` is still current.
- The migration/fallback pattern is a reasonable approach, though in production one should consider that a secret not found in Vault (vs. a Vault connection error) may warrant different handling.
