# Validation Summary: How to Organize CRDs Installation in a Flux CD Repository

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD Kustomization resources
- Flux HelmRelease resources
- Kubernetes Custom Resource Definitions
- Kustomize
- Helm
- cert-manager
- kubectl and flux CLI commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- cert-manager v1.14 Helm installation documentation: https://cert-manager.io/v1.14-docs/installation/helm/
- Helm `show crds` documentation: https://helm.sh/docs/helm/helm_show_crds/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes kubectl kustomize reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/

## Issues Found
- The failure example was fenced as `yaml` even though it contains CLI error output, not YAML. Changed the fence to `text`.
- The HelmRelease CRD policy example used cert-manager with `installCRDs: false`, which would not install cert-manager CRDs as described because cert-manager uses its own `installCRDs` chart value for CRD templating. Replaced the example with a generic operator chart that fits Flux's `install.crds` and `upgrade.crds` policy.
- The CRD extraction command used `kubectl split-yaml`, which is not part of the standard kubectl command set. Replaced it with Helm's documented `helm show crds` command for charts that expose CRDs through Helm's CRD mechanism.

## Review Notes
The three-layer Flux dependency approach is consistent with Flux documentation for ensuring CRDs and controllers are ready before custom resources are applied. The cert-manager CRD URL versions referenced in the post were reachable at review time. Future updates should keep cert-manager chart behavior in mind, because its CRD lifecycle differs from charts that place CRDs in Helm's `crds/` directory.
