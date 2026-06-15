# Validation Summary: How to Deploy Helm Charts with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm
- Kubernetes
- GitOps
- Helm charts
- OCI registries
- ApplicationSets

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Multiple Sources documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/multiple_sources/
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD CLI command reference for `argocd repo add` and `argocd app`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repo_add/ and https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app/
- Argo CD Tracking and Deployment Strategies documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/tracking_strategies/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/

## Issues Found
- The post said Argo CD applies Helm-rendered manifests with `kubectl apply`. Official Argo CD docs describe Helm as being used only to inflate charts with `helm template`, while Argo CD handles the application lifecycle. Changed the wording to say Argo CD syncs the rendered resources to the cluster.
- The OCI Application example used `repoURL: oci://ghcr.io/myorg/charts`. Argo CD's Helm documentation and private repository documentation state that Helm OCI sources omit the `oci://` protocol. Updated the example to `repoURL: ghcr.io/myorg/charts`.
- The hook section claimed `skipCrds: false` and `passCredentials: false` disable hook conversion. Those fields control Helm CRD rendering and credential passing, not hooks. Replaced the snippet with guidance to remove Helm hook annotations when a resource should be treated as a normal Kubernetes resource.
- The troubleshooting section described `helm.values` as an object. Argo CD's Application spec defines `values` as a block string, with `valuesObject` available for structured values. Updated the incorrect example to show that directly nesting a map under `values` is wrong and that a YAML block string is correct.

## Review Notes
- The post uses the `values` block string consistently, which remains supported. Argo CD documentation currently recommends `valuesObject` where possible, but the existing examples are still valid.
- External Helm value files from a separate Git repository require Argo CD v2.6 or later through multiple sources. The post's pattern is valid for current Argo CD versions.
