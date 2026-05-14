# Validation Summary: How to Restrict Tenant Access to Specific Sources in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes RBAC
- Kubernetes Kustomize
- Flux GitRepository and HelmRepository sources
- Flux Kustomization and HelmRelease resources

## Sources Consulted
- Flux multi-tenancy configuration: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux security documentation: https://fluxcd.io/flux/security/
- Flux CLI `flux get sources git`: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux CLI `flux get sources helm`: https://fluxcd.io/flux/cmd/flux_get_sources_helm/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl/

## Issues Found
- The post said cross-namespace references must be explicitly enabled. Flux documentation says sources are assumed to be in the same namespace by default, but cross-namespace references are supported by specifying `sourceRef.namespace` unless the relevant controller is started with `--no-cross-namespace-refs=true`. Updated the explanation.
- The controller patch only targeted kustomize-controller and used a deployment args replacement style that could be unsafe. Updated it to the documented JSON6902 patch pattern and targeted both kustomize-controller and helm-controller for the post's Kustomization and HelmRelease examples.
- The post used `spec.accessFrom.namespaceSelectors` on a HelmRepository. Flux source objects such as GitRepository, HelmRepository, and OCIRepository do not document this ACL field; `accessFrom` is documented for image automation resources such as ImageRepository, not source-controller sources. Removed the invalid field and clarified that cross-namespace source sharing must be constrained with RBAC or admission policy.

## Review Notes
The remaining Flux source, HelmRelease, RBAC, `flux get sources`, and `kubectl --as` examples are consistent with current official documentation. The sample URLs such as `https://charts.example.com/stable` and `https://github.com/org/team-alpha-apps` are illustrative placeholders and were treated as examples rather than live endpoints.
