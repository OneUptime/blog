# Validation Summary: How to Handle Helm Chart Version Pinning in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD Notifications
- Kubernetes
- Helm charts and Helm CLI
- OCI Helm registries
- GitOps version promotion

## Sources Consulted
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD OCI user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Helm revision resolution source: https://github.com/argoproj/argo-cd/blob/master/reposerver/repository/repository.go
- Argo CD semantic version tag resolution source: https://github.com/argoproj/argo-cd/blob/master/util/versions/tags.go
- Masterminds semver constraints documentation: https://github.com/Masterminds/semver
- Helm `search repo` command documentation: https://helm.sh/docs/helm/helm_search_repo/
- Helm chart dependency best practices: https://helm.sh/docs/chart_best_practices/dependencies/
- Renovate Helm v3 manager documentation: https://docs.renovatebot.com/modules/manager/helmv3/

## Issues Found
- The OCI Helm registry example used `repoURL: oci://ghcr.io/myorg/charts` together with `chart: my-app`. Argo CD's Helm source examples for OCI charts use a registry/repository URL without the `oci://` prefix when `chart` is set. Updated the snippet to `repoURL: ghcr.io/myorg/charts` and clarified the comment.
- The monitoring example claimed Argo CD Notifications could alert when a newer upstream chart version was available by checking `app.status.summary.externalURLs`. That field is unrelated to Helm chart freshness. Reworded the section to state that Argo CD Notifications can alert on deployed revision changes, while upstream chart update detection should be handled by a dependency update tool such as Renovate. Replaced the trigger with a valid `oncePer: app.status.sync.revision` example.

## Review Notes
Argo CD uses Helm only to render manifests; it does not manage Helm release lifecycle like `helm install` or `helm upgrade`. The self-heal discussion is acceptable as drift reconciliation guidance, but future revisions could make this distinction more explicit.
