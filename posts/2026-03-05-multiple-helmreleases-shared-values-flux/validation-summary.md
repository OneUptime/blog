# Validation Summary: How to Manage Multiple HelmReleases with Shared Values in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux Kustomization
- Kubernetes ConfigMap
- Kubernetes Secret
- Helm CLI
- kubectl
- Kustomize post-build variable substitution

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux guide for managing Helm releases: https://fluxcd.io/flux/guides/helmreleases/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Helm `get values` documentation: https://helm.sh/docs/helm/helm_get_values/

## Issues Found
- The verification section described `kubectl get helmrelease service-a -n apps -o jsonpath='{.status.lastAppliedRevision}'` as inspecting rendered values. That field reports the last applied revision, so the command comment was updated to describe what it actually returns.
- The Flux CLI status command used `flux get helmrelease --all-namespaces`. Official Flux documentation lists the command as `flux get helmreleases`, so the example was corrected to `flux get helmreleases --all-namespaces`.

## Review Notes
The HelmRelease `valuesFrom` examples, ConfigMap and Secret manifests, merge-order explanation, Flux Kustomization post-build substitution fields, and Helm/Kubernetes API versions were consistent with current official documentation. For production GitOps repositories, shared Secret values should normally be encrypted or sourced from a secret-management workflow rather than committed as plain text.
