# Validation Summary: How to Manage Dapr Secrets with External Secrets Operator

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar components, state store, pub/sub)
- External Secrets Operator (ESO)
- Kubernetes (secrets, service accounts, Helm)
- AWS Secrets Manager (with IRSA authentication)
- HashiCorp Vault (KV v2 engine, Kubernetes auth)

## Sources Consulted
- External Secrets Operator official docs — https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator AWS provider docs — https://external-secrets.io/latest/provider/aws-secrets-manager/
- Dapr component secrets reference — https://docs.dapr.io/operations/components/component-secrets/
- Dapr Redis state store docs — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- ESO Helm chart installation guide — https://external-secrets.io/latest/introduction/getting-started/

## Issues Found
1. **Vault ExternalSecret `remoteRef.key` was double-prefixed.** The `remoteRef.key` was set to `secret/data/kafka/dapr`, but the ClusterSecretStore already specifies `path: "secret"` and `version: "v2"`. ESO automatically constructs the full Vault API path by prepending the mount path and inserting `/data/` for KV v2. Using `secret/data/kafka/dapr` would result in ESO requesting `/v1/secret/data/secret/data/kafka/dapr`, which would fail. Changed to `kafka/dapr`.

## Review Notes
- The ESO API version `external-secrets.io/v1beta1` is valid and widely used. Newer ESO releases (v0.10+) also support `v1`. The v1beta1 API is not yet deprecated but teams starting fresh may prefer `v1`.
- The `--set installCRDs=true` Helm flag is valid but may be redundant in newer chart versions where CRDs install by default. Keeping it is harmless and explicit.
- The Dapr component omits `auth.secretStore`, which correctly defaults to the Kubernetes secret store when running in Kubernetes.
