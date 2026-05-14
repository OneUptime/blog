# Validation Summary: How to Use Weave GitOps Dashboard with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Weave GitOps
- Kubernetes
- Flux HelmRepository and HelmRelease resources
- Flux notification Alert resources
- Kubernetes RBAC, Secrets, Services, and Ingress
- OIDC authentication

## Sources Consulted
- Weave GitOps Open Source installation documentation: https://docs.gitops.weaveworks.org/docs/open-source/getting-started/install-OSS/
- Weave GitOps Helm chart reference: https://docs.gitops.weaveworks.org/docs/references/helm-reference/
- Weave GitOps emergency user documentation: https://docs.gitops.weaveworks.org/docs/0.21.1/configuration/emergency-user/
- Weave GitOps OIDC documentation: https://docs.gitops.weaveworks.org/docs/guides/oidc/
- Weave GitOps chart source templates and values: https://github.com/weaveworks/weave-gitops/tree/v0.38.0/charts/gitops-server
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI reference for `flux reconcile helmrelease`: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux CLI reference for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1beta3/

## Issues Found
- The prerequisites listed Kubernetes v1.26 or later, which is stale against current Flux installation requirements. Changed this to require a Kubernetes cluster supported by the user's Flux version.
- The prerequisites listed Helm v3, but the guide does not use the local Helm CLI. The password-generation command does require the Weave GitOps `gitops` CLI, so the prerequisite was corrected.
- The HelmRelease enabled an admin user without limiting the Weave GitOps service account impersonation to that user. Added `rbac.impersonationResourceNames: [admin]` to match the chart's RBAC guidance.
- The OIDC HelmRelease used `oidcSecret: oidc-auth`, but the Weave GitOps chart expects `oidcSecret` to be an object with fields such as `create`, `clientID`, `clientSecret`, `issuerURL`, and `redirectURL`. Updated the snippet to use the manually created `oidc-auth` Secret by setting `oidcSecret.create: false`.
- The Flux Alert snippet used `notification.toolkit.fluxcd.io/v1`, but current Flux docs define Alerts under `notification.toolkit.fluxcd.io/v1beta3`. Updated the API version.
- The troubleshooting command used `flux get helmrelease`, while the documented Flux command is `flux get helmreleases`. Updated the command.

## Review Notes
Weave GitOps OSS documentation is still available, but the latest documented release is old relative to the current review date. The post is still technically useful when treated as guidance for Weave GitOps 0.38-era installations on a currently supported Flux/Kubernetes stack.
