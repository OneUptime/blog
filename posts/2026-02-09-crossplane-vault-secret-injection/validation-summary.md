# Validation Summary: How to Implement Crossplane with Vault for Secret Injection

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Crossplane
- Crossplane composition functions
- Crossplane External Secret Stores
- External Secrets Operator
- HashiCorp Vault
- Vault Kubernetes auth
- Vault dynamic database secrets
- Vault Agent Injector
- Kubernetes Secrets and encryption at rest
- Upbound AWS provider

## Sources Consulted
- Crossplane Compositions documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane Function Patch and Transform guide: https://docs.crossplane.io/latest/guides/function-patch-and-transform/
- Crossplane Providers and DeploymentRuntimeConfig documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane Vault as an External Secret Store guide: https://docs.crossplane.io/v1.20/guides/vault-as-secret-store/
- Crossplane v2 migration guidance: https://docs.crossplane.io/latest/guides/upgrade-to-crossplane-v2/
- External Secrets Operator Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator VaultDynamicSecret generator documentation: https://external-secrets.io/latest/api/generator/vault/
- HashiCorp Vault Kubernetes auth API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault Agent Injector documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector
- HashiCorp Vault Agent Injector annotations: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault telemetry metrics documentation: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/all
- Kubernetes encryption at rest documentation: https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/
- Upbound AWS RDS Instance resource documentation: https://marketplace.upbound.io/providers/upbound/provider-aws-rds
- Upbound AWS ProviderConfig and StoreConfig documentation: https://marketplace.upbound.io/providers/upbound/provider-family-aws

## Issues Found
- Updated External Secrets Operator examples from `external-secrets.io/v1beta1` to the current `external-secrets.io/v1` API.
- Corrected the Vault Kubernetes auth role to use `token_policies` instead of deprecated `policies`, added an `audience`, and included the TokenReview ClusterRoleBinding needed by the Vault reviewer service account.
- Fixed the Vault KV v2 policy so read access targets `secret/data/...` and list access targets `secret/metadata/...`.
- Corrected the claim that Crossplane never sees plaintext secrets. The provider reads the Kubernetes Secret created by ESO; the benefit is avoiding secrets in Git and manifests.
- Replaced deprecated/invalid Crossplane composition examples with `mode: Pipeline` and `function-patch-and-transform` input.
- Replaced non-existent `function-vault-push` and `function-vault-transit-encrypt` examples with documented Crossplane External Secret Stores behavior and Kubernetes encryption at rest guidance.
- Replaced the invalid ESO Vault provider example for `database/creds/...` with the documented `VaultDynamicSecret` generator.
- Replaced the direct provider `Deployment` mutation example with a `DeploymentRuntimeConfig`, and corrected AWS provider credentials to use `source: Filesystem`.
- Replaced the invalid `sys/rotate/crossplane-database` command with correct static KV update guidance and the documented `database/rotate-root/:name` command for database root credential rotation.
- Replaced unreliable Vault request metric examples with documented Vault audit failure telemetry metrics and moved path-specific denied/missing-secret alerting to audit-log processing.
- Clarified Vault HA configuration comments and the meaning of the Vault Enterprise `namespace` field.

## Review Notes
Crossplane External Secret Stores are alpha, disabled by default, and not recommended for production. Crossplane v2 migration guidance recommends moving away from External Secret Stores to native Kubernetes Secrets or External Secrets Operator patterns.
