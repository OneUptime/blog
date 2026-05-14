# Validation Summary: How to Fix 'install retries exhausted' Error in Flux CD HelmRelease

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux Kustomization
- Helm
- Kubernetes
- RBAC
- Custom Resource Definitions

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization guide: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI reference for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux CLI reference for `flux reconcile source helm`: https://fluxcd.io/flux/cmd/flux_reconcile_source_helm/
- Flux CLI reference for `flux reconcile helmrelease`: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Helm CLI reference for `helm install`: https://helm.sh/docs/v3/helm/helm_install/
- Helm CLI reference for `helm template`: https://helm.sh/docs/v3/helm/helm_template/

## Issues Found
- The namespace creation example placed the HelmRelease in the same namespace it was intended to create. Updated the example to place the HelmRelease in `flux-system` and set `spec.targetNamespace: my-namespace`, because Flux `install.createNamespace` creates the HelmRelease target namespace, not the namespace needed to store the HelmRelease object.
- The CRD dependency example used `HelmRelease.spec.dependsOn` to reference a Flux Kustomization. Updated the snippet to use a second Flux Kustomization that depends on the CRD Kustomization, because HelmRelease dependencies can only reference other HelmRelease resources.
- The install remediation example used invalid fields: `spec.install.retries` and `spec.install.remediation.retryOn`. Removed those fields and used `spec.install.remediation.retries` with `remediateLastFailure`, which are valid Flux HelmRelease v2 fields.
- The reset guidance recommended patching status conditions. Replaced that with Flux's supported retry reset mechanisms: `flux reconcile helmrelease --reset` and the equivalent `reconcile.fluxcd.io/resetAt` annotation.

## Review Notes
The local environment did not have `helm`, `flux`, or `kubectl` installed, so command behavior was verified against official CLI documentation rather than local `--help` output.
