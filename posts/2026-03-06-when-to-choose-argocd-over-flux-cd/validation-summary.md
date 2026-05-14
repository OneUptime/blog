# Validation Summary: When to Choose ArgoCD Over Flux CD

## Status
validated

## Post Type
Decision guide

## Technologies Covered
- Argo CD
- Flux CD
- GitOps
- Kubernetes
- ApplicationSet
- Kubernetes RBAC and Argo CD RBAC
- OIDC SSO
- Helm

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD OIDC user management: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD ApplicationSet Git generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Cluster generator: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Go Template migration guide: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD sync windows: https://argo-cd.readthedocs.io/en/latest/user-guide/sync_windows/
- Argo CD sync phases and resource hooks: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD installation and getting started documentation: https://argo-cd.readthedocs.io/en/release-2.12/getting_started/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux notification controller documentation: https://fluxcd.io/flux/components/notification/
- Flux Helm controller documentation: https://fluxcd.io/docs/components/helm/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The PostSync notification Job used a Kubernetes `command` array with `$(SLACK_WEBHOOK_URL)` as an argument. Kubernetes does not expand shell variables unless a shell is invoked, so this would pass the webhook URL placeholder literally. Changed the example to run `sh -c`, quote `$SLACK_WEBHOOK_URL`, set the JSON content type, and source the webhook URL from a Secret.
- The decision matrix said Flux supports "Helm hooks only" for resource hooks. Flux's Helm controller also supports Helm tests and remediation behavior around Helm actions, so this was narrowed to "Helm hooks and tests."

## Review Notes
- The ApplicationSet Git generator example uses the default fasttemplate syntax (`{{path}}`, `{{path.basename}}`), which is still documented for `goTemplate: false`. For new examples, Argo CD's Go Template syntax with `goTemplate: true` and `{{.path.path}}` / `{{.path.basename}}` is commonly preferred.
