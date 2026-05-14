# Validation Summary: How to Use HelmRelease for Deploying Vault with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRepository
- Flux HelmRelease
- Kubernetes
- Helm
- HashiCorp Vault
- Vault Helm chart
- Vault integrated Raft storage
- Vault Kubernetes authentication
- Vault Agent Injector
- Vault CSI provider

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- HashiCorp Vault Helm chart values: https://github.com/hashicorp/vault-helm/blob/main/values.yaml
- HashiCorp Vault Helm chart Kubernetes run documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/helm/run
- HashiCorp Vault Kubernetes Raft deployment guide: https://developer.hashicorp.com/vault/tutorials/kubernetes/kubernetes-raft-deployment-guide
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Agent Injector annotation documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault CLI operator init documentation: https://developer.hashicorp.com/vault/docs/commands/operator/init
- HashiCorp Vault CLI operator unseal documentation: https://developer.hashicorp.com/vault/docs/commands/operator/unseal
- HashiCorp Vault CLI operator raft documentation: https://developer.hashicorp.com/vault/docs/commands/operator/raft

## Issues Found
- The HelmRelease was placed in the `vault` namespace while relying on `install.createNamespace: true`. Flux/Helm can create the Helm target namespace, but the HelmRelease custom resource itself must already be applied to an existing namespace. Changed the HelmRelease namespace to `flux-system`, added `targetNamespace: vault`, and set `releaseName: vault` so the generated Vault resources and pod names remain consistent with the commands in the post.
- The TLS-enabled Vault server configuration mounted a CA file but did not set `VAULT_CACERT` for Vault CLI commands run inside the pod. Added `server.extraEnvironmentVars.VAULT_CACERT` pointing to the mounted CA path.
- The Raft `retry_join` blocks only specified the leader CA certificate. HashiCorp's TLS Raft examples include the leader client certificate and key when using the mounted Vault TLS secret. Added `leader_client_cert_file` and `leader_client_key_file` to each `retry_join` block.
- The post included manual `vault operator raft join` commands even though the configuration already uses `retry_join` for automatic cluster joining. Replaced those commands with a note that `retry_join` handles joining and that the remaining replicas still need to be unsealed.
- The original prerequisites referenced TLS-backed configuration without saying the `vault-tls` secret must exist. Added the required TLS secret and keys to the prerequisites.

## Review Notes
- The chart version constraint `0.x` is technically valid as a broad Helm semver range for current Vault chart releases, but production GitOps repositories should usually pin a narrower chart version to make upgrades deliberate.
- The Kubernetes auth configuration is minimal and can work for Vault running inside Kubernetes, but production setups should also review token reviewer permissions, issuer settings, and service account token behavior for the Kubernetes version in use.
- Local `helm`, `flux`, and `kubectl` binaries were not installed in the workspace, so CLI behavior was checked against official documentation rather than local help output.
