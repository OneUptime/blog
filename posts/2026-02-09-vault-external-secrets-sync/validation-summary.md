# Validation Summary: How to use Vault with External Secrets Operator for sync to Kubernetes secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault
- External Secrets Operator
- Kubernetes Secrets
- Kubernetes Deployments
- Helm
- kubectl

## Sources Consulted
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator HashiCorp Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator Vault Dynamic Secret generator documentation: https://external-secrets.io/latest/api/generator/vault/
- External Secrets Operator Helm installation documentation: https://external-secrets.io/v0.12.0/introduction/getting-started/
- External Secrets Operator Helm chart values for v1beta1 deprecation: https://github.com/external-secrets/external-secrets/blob/main/deploy/charts/external-secrets/values.yaml
- HashiCorp Vault kv get command documentation: https://developer.hashicorp.com/vault/docs/commands/kv/get
- HashiCorp Vault KV v2 read data documentation: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2/cookbook/read-data

## Issues Found
- The ESO examples used `apiVersion: external-secrets.io/v1beta1`. Current ESO documentation uses `external-secrets.io/v1`, and current chart values mark v1beta1 serving as deprecated backward compatibility. Updated SecretStore, ClusterSecretStore, and ExternalSecret manifests to `external-secrets.io/v1`.
- The dynamic database credentials example used the normal Vault provider with `remoteRef` against `database/creds/app-role`. ESO's HashiCorp Vault provider supports the KV secrets engine; dynamic secret engines should use the Vault Dynamic Secret generator. Replaced the example with a `VaultDynamicSecret` generator and an `ExternalSecret` that references it through `dataFrom.sourceRef.generatorRef`.
- The rotation section said ESO automatically rotates secrets on a schedule. ESO polls and syncs the provider value; it does not itself rotate Vault KV secrets. Reworded the section to describe polling Vault for a rotated value.
- The troubleshooting section mentioned ServiceAccount permissions but omitted the TokenReview permission requirement for Vault Kubernetes auth. Clarified that TokenReview permissions are part of the required permissions.

## Review Notes
- The Helm install commands, Vault KV v2 path comments, `data`, `dataFrom.extract`, templating fields, `creationPolicy`, `deletionPolicy`, and Kubernetes Deployment secret references are consistent with the official documentation reviewed.
- The examples intentionally leave Vault role, policy, and Kubernetes auth setup implicit. A future post could add those setup steps, but the snippets in this post are technically valid once that prerequisite configuration exists.
