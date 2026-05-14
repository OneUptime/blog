# Validation Summary: How to Use HelmRelease for Deploying ArgoCD with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease and HelmRepository APIs
- Kubernetes
- Helm
- Argo CD
- Argo CD Helm chart
- Argo CD Application resources
- OIDC single sign-on

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux helm-controller HelmRelease CRD: https://github.com/fluxcd/helm-controller/blob/main/config/crd/bases/helm.toolkit.fluxcd.io_helmreleases.yaml
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Argo CD Helm chart metadata: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/Chart.yaml
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD getting started documentation: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD Application auto-sync documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD argocd-cm example configuration: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/argocd-cm.yaml
- Argo CD command parameters example configuration: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/argocd-cmd-params-cm.yaml
- Argo CD user management and SSO secret documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/

## Issues Found
- The HelmRelease example used `install.atomic` and `upgrade.atomic`, but those fields are not part of the Flux HelmRelease v2 CRD. Removed both fields and kept the Flux-supported remediation and cleanup fields.
- The Argo CD chart version range used `7.x`, while the official Argo CD Helm chart is currently on the `9.x` major line. Updated the example to `version: "9.x"`.
- The ingress guidance mixed SSL passthrough annotations with a commented TLS-termination `--insecure` example. Updated the comment to explain that TLS termination requires removing the passthrough/backend HTTPS annotations and setting `configs.params.server.insecure` to `"true"`.
- The `server.enable.gzip` parameter was described as server-side diff. Updated the comment to correctly describe gzip compression and quoted the value as a string for the generated Argo CD command parameters ConfigMap.
- The OIDC snippet referenced `$oidc.keycloak.clientSecret` without showing where that secret key is supplied. Added `configs.secret.extra.oidc.keycloak.clientSecret` to the snippet.
- The main values example described `url` as a Dex example even though it is the Argo CD external URL used for SSO callbacks. Updated the comment.

## Review Notes
The examples are now aligned with current Flux v2 APIs and the current Argo CD Helm chart values. The production ingress and SSO snippets still require environment-specific choices such as certificate management, ingress controller behavior, and secure secret management.
