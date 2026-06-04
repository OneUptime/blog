# Validation Summary: How to Use External Secrets Operator with HashiCorp Vault Backend

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- External Secrets Operator
- HashiCorp Vault
- Vault KV v2 secrets engine
- Vault Kubernetes authentication
- Vault AppRole authentication
- Vault database secrets engine
- Helm
- Stakater Reloader

## Sources Consulted
- External Secrets Operator HashiCorp Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator Vault Dynamic Secret generator documentation: https://external-secrets.io/latest/api/generator/vault/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator templating v2 guide: https://external-secrets.io/latest/guides/templating/
- External Secrets Operator getting started / Helm install documentation: https://external-secrets.io/latest/introduction/getting-started/
- External Secrets Operator API specification: https://external-secrets.io/v0.19.0/api/spec/
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes auth API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault AppRole auth API documentation: https://developer.hashicorp.com/vault/api-docs/auth/approle
- HashiCorp Vault database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault database secrets engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/databases
- HashiCorp Vault PostgreSQL database plugin API documentation: https://developer.hashicorp.com/vault/api-docs/secret/databases/postgresql

## Issues Found
- The ESO manifests used `external-secrets.io/v1beta1`, while current ESO documentation uses the stable `external-secrets.io/v1` API for `SecretStore`, `ClusterSecretStore`, and `ExternalSecret`. Updated the examples to `external-secrets.io/v1`.
- The Vault Kubernetes and AppRole role commands used the deprecated `policies` parameter. Replaced it with `token_policies`, and replaced the Kubernetes role's `ttl` with `token_ttl`.
- The Kubernetes auth examples omitted an audience. Current ESO/Vault documentation notes that Vault 1.21 and later require Kubernetes auth roles to include an audience, so the Vault role now sets `audience=vault` and ESO service account references request the `vault` audience.
- The namespace-scoped `SecretStore` examples referenced Kubernetes objects in `external-secrets-system`. For namespace-scoped stores, those references should resolve in the store namespace, so the AppRole Secret and CA ConfigMap examples were moved to `production`, and the cross-namespace service account reference remains only in the `ClusterSecretStore` example.
- The dynamic database credentials example attempted to fetch `database/creds/readonly` through the Vault KV provider. ESO documents the Vault provider as a KV backend provider and directs non-KV dynamic secret engines to the Vault Dynamic Secret generator. Replaced that example with a `VaultDynamicSecret` generator and an `ExternalSecret` that references it.

## Review Notes
The Helm install, Vault KV v2 commands, ExternalSecret `data` and `dataFrom.extract` usage, template engine v2 usage, Vault Enterprise namespace field, and TLS CA provider pattern are consistent with the consulted documentation after the corrections above.
