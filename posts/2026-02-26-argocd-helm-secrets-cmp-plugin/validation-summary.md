# Validation Summary: How to Use Helm Secrets Plugin with ArgoCD CMP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Config Management Plugins
- helm-secrets
- SOPS
- Helm
- Kubernetes Secrets
- Docker
- age
- AWS KMS / IRSA

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/config-management-plugins/
- Argo CD current Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo CD Build Environment documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/build-environment/
- helm-secrets Argo CD Integration documentation: https://github.com/jkroepke/helm-secrets/wiki/ArgoCD-Integration
- Helm `helm template` command documentation: https://helm.sh/docs/v3/helm/helm_template/
- Helm plugin documentation: https://helm.sh/docs/topics/plugins/
- Helm `helm plugin install` documentation: https://helm.sh/docs/helm/helm_plugin_install/
- SOPS documentation / project README: https://github.com/getsops/sops
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The `ConfigManagementPlugin` example set `spec.version: v1.0` while the Application referenced `plugin.name: helm-secrets`. Argo CD requires `<metadata.name>-<spec.version>` when `spec.version` is present. Removed the version field so the Application name is correct.
- The CMP shell examples used `sh` with `set -euo pipefail` and unquoted string-assembled Helm arguments. Switched the examples to `bash` and Bash arrays so `pipefail` is supported and values file arguments are passed safely.
- The Dockerfile installed the Helm plugin as root without setting `HELM_PLUGINS`, which would leave the plugin under root's Helm plugin directory and unavailable to UID 999 at runtime. Added Helm environment paths under `/home/argocd`, created those directories, and fixed ownership.
- The Dockerfile copied `argocd-cmp-server` from a specific Argo CD image and used that copied path as the entrypoint. Argo CD sidecar CMP documentation expects the sidecar to use the `argocd-cmp-server` binary made available through the `/var/run/argocd` mount, so the entrypoint was changed to `/var/run/argocd/argocd-cmp-server`.
- The sidecar deployment mounted `/tmp` as `cmp-tmp` but did not define that volume. Added the missing `cmp-tmp` `emptyDir` volume and a pod `fsGroup` so mounted writable Helm directories are accessible to UID 999.
- The SOPS encrypted-file example showed `sops.age` as a scalar recipient. SOPS age metadata is a list of recipient entries with encrypted stanzas, so the example was adjusted to reflect the actual shape and include a MAC field.
- The Helm Secret template emitted values directly into YAML. Added `quote` so rendered string values remain valid YAML when secrets contain special characters.
- The multi-environment CMP example read `ENVIRONMENT` directly. User-supplied Argo CD plugin environment variables are exposed to CMP commands with the `ARGOCD_ENV_` prefix, so it now reads `ARGOCD_ENV_ENVIRONMENT`.

## Review Notes
- The guide intentionally uses a custom CMP because Argo CD's native Helm integration does not directly run arbitrary Helm plugins in the same way as a custom sidecar toolchain.
- The example still pins specific tool versions. Those versions are valid for the documented approach, but future maintenance should periodically update Argo CD, SOPS, and helm-secrets versions.
- Kubernetes Secrets rendered by Helm are still plaintext in the generated manifests and in the cluster API. This pattern protects values at rest in Git, not every downstream location where rendered manifests or Kubernetes Secrets may be visible.
