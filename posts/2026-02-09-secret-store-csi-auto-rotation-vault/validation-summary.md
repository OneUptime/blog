# Validation Summary: How to Configure Secret Store CSI Driver with Auto Rotation for Vault Secrets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Secrets Store CSI Driver
- HashiCorp Vault
- Vault Secrets Store CSI provider
- Helm
- Vault Kubernetes auth method
- Vault KV v2 secrets engine
- Vault database secrets engine
- Python file watching

## Sources Consulted
- Secrets Store CSI Driver installation docs: https://secrets-store-csi-driver.sigs.k8s.io/getting-started/installation
- Secrets Store CSI Driver auto rotation docs: https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation
- Secrets Store CSI Driver Kubernetes Secret sync docs: https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret
- Secrets Store CSI Driver concepts docs: https://secrets-store-csi-driver.sigs.k8s.io/concepts.html
- HashiCorp Vault Secrets Store CSI provider overview: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi
- HashiCorp Vault Secrets Store CSI provider installation docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi/installation
- HashiCorp Vault Secrets Store CSI provider configuration docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi/configurations
- HashiCorp Vault Helm chart external Vault docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/examples/external
- HashiCorp Vault Kubernetes auth docs: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault database secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault KV v2 docs: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- HashiCorp Vault Agent caching docs: https://developer.hashicorp.com/vault/docs/agent/caching

## Issues Found
- The post used the singular product name "Secret Store CSI Driver"; updated the technical references to the official "Secrets Store CSI Driver" name while preserving the requested validation-summary title.
- The Vault CSI provider Helm install command used a non-documented standalone `hashicorp/vault-csi-provider` chart. Replaced it with the official `hashicorp/vault` chart installation using `csi.enabled=true` and `global.externalVaultAddr` for an external Vault address.
- The Vault CSI provider verification and log commands used the `kube-system` namespace. Updated them to the `vault` namespace to match the corrected Helm install command.
- The post implied Kubernetes Secrets are never involved even though it enables `syncSecret.enabled=true` and later shows `secretObjects`. Clarified that etcd/Kubernetes Secret storage is avoided unless optional sync is enabled.
- The deployment example named environment variables `DB_USERNAME` and `DB_PASSWORD` while assigning file paths, which could imply secret values are injected into environment variables. Renamed them to `DB_USERNAME_FILE` and `DB_PASSWORD_FILE` and clarified that the application reads mounted files.
- The rotation explanation said the driver polls Vault every 60 seconds. Current driver docs describe rotation through CSI republish calls and the configured rotation interval as a minimum cache duration. Reworded this to avoid implying exact polling behavior.
- The dynamic secrets section claimed the CSI Driver automatically requests new credentials before expiration. HashiCorp documents dynamic lease caching and renewal as Vault Agent behavior when configured through the Helm provider path. Updated the text to describe Vault Agent caching/renewal and CSI file refresh separately.
- The Kubernetes Secret sync section implied the Secret is created immediately by the SecretProviderClass. Clarified that sync occurs after a pod mounts the SecretProviderClass.

## Review Notes
The examples are intentionally generic and omit production hardening details such as Vault TLS CA configuration, service account TokenReview RBAC, and application-specific reconnection behavior after file changes. The auto rotation feature is still documented by the CSI driver as alpha.
