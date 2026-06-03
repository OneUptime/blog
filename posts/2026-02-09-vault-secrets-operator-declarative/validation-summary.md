# Validation Summary: How to use Vault Secrets Operator for declarative secret management

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HashiCorp Vault
- Vault Secrets Operator
- Kubernetes custom resources
- Helm
- Kustomize / GitOps
- Vault KV, dynamic database secrets, PKI, and Transit

## Sources Consulted
- HashiCorp Vault Secrets Operator overview: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso
- HashiCorp Vault Secrets Operator installation guide: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/installation
- HashiCorp Vault Secrets Operator Vault source docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/sources/vault
- HashiCorp Vault Secrets Operator API reference: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/api-reference
- HashiCorp Vault Secrets Operator secret transformation docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/secret-transformation
- HashiCorp Vault Secrets Operator client cache docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso/sources/vault/client-cache
- Official Vault Secrets Operator CRDs and samples from HashiCorp GitHub v1.4.0: https://github.com/hashicorp/vault-secrets-operator/tree/v1.4.0

## Issues Found
- The Helm install command pinned VSO chart version 0.4.0, which is outdated. Updated the example to the current documented chart version 1.4.0 and aligned the namespace with the current installation docs.
- The overview claimed VSO supports all Vault authentication methods and secret engines. Adjusted the wording to avoid overclaiming beyond the documented CRD/auth support.
- The VaultAuth examples referenced a VaultConnection in another Kubernetes namespace without using the required namespace-prefixed reference. Updated references such as `vault-secrets-operator/vault-connection`.
- The post used `spec.namespace` on VaultAuth as if it selected the Kubernetes namespace containing VaultConnection. Removed that usage because the field is for Vault namespaces.
- The PKI example used `renewBefore`, which is not a VaultPKISecret field. Replaced it with the documented `expiryOffset` field.
- The caching example implied `storageEncryption` alone enables caching for an application VaultAuth. Updated it to use the operator service account/label and added the required Helm client cache persistence setting note.
- The multiple-Vault example omitted `type: kv-v2` and `destination.create: true` for VaultStaticSecret. Added both fields.
- The rotation example included an unsupported `selector` under `rolloutRestartTargets`. Removed it because rollout restart targets support `kind` and `name`.
- The rotation example described `refreshAfter` as forcing refresh for leased dynamic database credentials. Reworded it as a fallback for engines that return no lease TTL.
- The deployment restart statement was unconditional. Reworded it to clarify restarts happen when matching `rolloutRestartTargets` are configured.

## Review Notes
The examples are now aligned with VSO v1.4.0 CRD schemas and current HashiCorp documentation. Helm and kubectl were not installed in the local environment, so CLI behavior was checked against official documentation rather than executed locally.
