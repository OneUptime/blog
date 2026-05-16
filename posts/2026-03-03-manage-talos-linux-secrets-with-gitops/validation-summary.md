# Validation Summary: How to Manage Talos Linux Secrets with GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- GitOps (Flux CD)
- Mozilla SOPS
- age encryption
- Bitnami Sealed Secrets (kubeseal)
- External Secrets Operator (ESO)
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes Secrets
- Helm
- git-secrets

## Sources Consulted
- SOPS releases (getsops/sops): https://github.com/getsops/sops/releases
- age releases (FiloSottile/age): https://github.com/FiloSottile/age/releases
- Sealed Secrets releases: https://github.com/bitnami-labs/sealed-secrets/releases
- Flux Kustomize Controller v1 API: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux SOPS guide (age.agekey key naming): https://fluxcd.io/flux/guides/mozilla-sops/
- Flux Sealed Secrets guide: https://fluxcd.io/flux/guides/sealed-secrets/
- External Secrets Operator v1 upgrade guide: https://external-secrets.io/latest/guides/v1beta1/
- External Secrets Operator API reference: https://external-secrets.io/latest/api/spec/
- Bitnami Sealed Secrets Helm chart: https://github.com/bitnami-labs/sealed-secrets/tree/main/helm/sealed-secrets

## Issues Found

1. **SOPS download URL was invalid.** The post used `https://github.com/getsops/sops/releases/latest/download/sops-v3-linux-amd64`, but SOPS release assets are named with the full version and dots (e.g. `sops-v3.9.4.linux.amd64`). There is no `sops-v3-linux-amd64` alias. Replaced with a pinned URL to `v3.9.4` and a note to use the latest release tag.

2. **age download URL was invalid.** The post used `https://github.com/FiloSottile/age/releases/latest/download/age-v1-linux-amd64.tar.gz`, but age tarballs are named with the full version (e.g. `age-v1.2.1-linux-amd64.tar.gz`). Replaced with a pinned URL to `v1.2.1` and a note to use the latest release tag.

3. **kubeseal download URL was invalid.** The post used `https://github.com/bitnami-labs/sealed-secrets/releases/latest/download/kubeseal-linux-amd64`, but the published asset is a versioned tarball (`kubeseal-<VERSION>-linux-amd64.tar.gz`) that must be extracted, not a bare binary. Replaced with a pinned URL to `v0.27.3` and added the `tar -xzf` extraction step.

4. **External Secrets Operator API version was outdated.** The post used `external-secrets.io/v1beta1` for both `ClusterSecretStore` and `ExternalSecret`. Since ESO v0.16 the `v1` API has been served alongside `v1beta1`, and from v0.17 onwards `v1` is the recommended GA version with `v1beta1` on a deprecation path. Updated all four occurrences to `external-secrets.io/v1`.

## Review Notes
- The Flux SOPS secret naming (`--from-file=age.agekey=age.key`) is correct: Flux's kustomize-controller specifically looks for secret data keys ending in `.agekey`.
- The `SealedSecret` `bitnami.com/v1alpha1` apiVersion is correct — the project has never been promoted past `v1alpha1`.
- The Flux `kustomize.toolkit.fluxcd.io/v1` API is the current GA version for Flux v2.
- The Sealed Secrets controller is installed into `kube-system` in this guide; this is the historical default for the static manifest install and works without extra `--controller-namespace` flags on `kubeseal`. The Helm chart itself does not default to `kube-system`, so users who follow newer convention with a dedicated `sealed-secrets` namespace would need to pass `--controller-namespace sealed-secrets` to `kubeseal`. Left as-is since the post is internally consistent.
- The pinned versions (SOPS `v3.9.4`, age `v1.2.1`, kubeseal `v0.27.3`) are reasonable as of the post's date; the inline comments instruct readers to substitute the latest release tag, which keeps the post resilient to upstream releases.
