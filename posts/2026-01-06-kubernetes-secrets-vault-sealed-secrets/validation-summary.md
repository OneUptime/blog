# Validation Summary: How to Secure Kubernetes Secrets with HashiCorp Vault or Sealed Secrets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes (Secrets, ServiceAccounts, Deployments)
- Bitnami Sealed Secrets (controller + kubeseal CLI)
- HashiCorp Vault (KV-v2, Kubernetes auth, policies)
- Vault Agent Sidecar Injector
- Vault CSI Provider / Secrets Store CSI Driver
- External Secrets Operator (ESO)
- Helm
- ArgoCD (GitOps integration)

## Sources Consulted
- Sealed Secrets project docs and kubeseal CLI reference — https://github.com/bitnami-labs/sealed-secrets (and DeepWiki kubeseal CLI page) — confirmed `--re-encrypt`, `--fetch-cert`, `--scope strict|namespace-wide|cluster-wide`, key auto-renewal every ~30 days, and the `sealedsecrets.bitnami.com/sealed-secrets-key` backup label.
- HashiCorp Vault Helm chart & Kubernetes auth docs — https://developer.hashicorp.com/vault/docs/platform/k8s/helm and https://developer.hashicorp.com/vault/docs/auth/kubernetes — confirmed `server.dev.enabled`, `server.ha.*`, `injector.enabled`, `csi.enabled`, `vault operator init` defaults (5 shares / 3 threshold), and Kubernetes auth config parameters.
- External Secrets Operator API & stability docs — https://external-secrets.io/latest/api/clustersecretstore/ and https://external-secrets.io/latest/introduction/stability-support/ — confirmed `external-secrets.io/v1` is the current stable API and that `v1beta1` is deprecated and removed in ESO v0.17.0+.
- Secrets Store CSI Driver — https://secrets-store-csi-driver.sigs.k8s.io/ — confirmed `secrets-store.csi.k8s.io` driver name and `SecretProviderClass` (`secrets-store.csi.x-k8s.io/v1`) schema.

## Issues Found
1. **Outdated External Secrets Operator API version.** The `ClusterSecretStore` and `ExternalSecret` manifests used `apiVersion: external-secrets.io/v1beta1`. That API is deprecated and is no longer served as of ESO v0.17.0+; the current stable API is `external-secrets.io/v1` (the spec fields used in the post are compatible). Changed both manifests to `external-secrets.io/v1`.
2. **`helm install` used for an already-installed release (Vault CSI Provider).** Method 2 ran `helm install vault hashicorp/vault --set csi.enabled=true`, but Vault was already installed earlier in the guide, so `helm install` would fail with a name-in-use error. Changed to `helm upgrade vault ...` to match the (correct) pattern used by Method 1's injector install.

## Review Notes
- The core claims are accurate: Kubernetes Secrets are base64-encoded (not encrypted), the `kubectl get secret ... | base64 -d` decode example is correct, and the SealedSecret CRD (`bitnami.com/v1alpha1`, `encryptedData`, `template`) is correct.
- The note that the `issuer` parameter for Vault Kubernetes auth is no longer required (deprecated around Vault 1.9.0, when issuer validation was disabled by default) is accurate.
- Vault CSI usage caveat (not an error, so not changed): the Vault Helm chart's `csi.enabled=true` installs only the Vault CSI *provider*; the underlying Secrets Store CSI Driver must be installed separately for the `SecretProviderClass`/CSI volume to function. Worth mentioning in a future revision.
- For KV-v2, the post correctly uses the `secret/data/...` path in Vault policies, Agent templates, and the CSI `secretPath`, while correctly omitting the `data/` prefix in the ESO `remoteRef.key` (ESO injects it automatically). These subtle path differences are handled correctly throughout.
- The comparison table and "when to use what" guidance are reasonable and accurate.
