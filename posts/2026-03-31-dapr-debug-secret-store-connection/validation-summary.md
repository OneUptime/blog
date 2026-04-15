# Validation Summary: How to Debug Secret Store Connection Issues in Dapr

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar runtime, secrets API, component model)
- HashiCorp Vault (as a secret store backend)
- Kubernetes (kubectl, RBAC, ServiceAccounts, CRDs)
- Dapr CLI

## Sources Consulted
- Dapr HashiCorp Vault secret store component reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr CLI components command reference: https://docs.dapr.io/reference/cli/dapr-components/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- HashiCorp Vault health endpoint: https://developer.hashicorp.com/vault/api-docs/system/health

## Issues Found
No technical issues found.

## Review Notes
- The `vaultAddr` metadata field name is correctly identified as the right field, and `vaultAddress` is correctly flagged as wrong, matching official Dapr documentation.
- The Dapr secrets API endpoint `/v1.0/secrets/{store-name}/{key}` is accurate for the current Dapr API.
- The `dapr components --kubernetes --namespace default` command uses valid flags per the Dapr CLI reference.
- `kubectl describe component` works because Kubernetes resolves the singular form to the `components.dapr.io` CRD.
- The default Dapr HTTP port (3500) and sidecar container name (`daprd`) are both correct.
- The RBAC Role and RoleBinding YAML is well-formed and follows Kubernetes best practices. The RoleBinding metadata omits an explicit `namespace` field, which is acceptable since it defaults to the namespace specified at apply time.
- The Vault health check endpoint `/v1/sys/health` is the correct standard endpoint.
