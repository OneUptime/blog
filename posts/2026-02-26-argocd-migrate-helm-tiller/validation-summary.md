# Validation Summary: How to Migrate from Helm Tiller to ArgoCD

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Helm v2 and Tiller
- Helm v3 chart format and dependencies
- Argo CD Applications and sync policies
- Kubernetes ConfigMaps, Secrets, labels, services, deployments, and RBAC
- GitOps repository structure

## Sources Consulted
- Helm v3 FAQ: Changes since Helm 2, including Tiller removal and Helm 2 release storage: https://blog.helm.sh/docs/v3/faq/changes_since_helm2/
- Helm troubleshooting note on Helm v2.17.0 final release and unsupported status since November 2020: https://helm.sh/docs/v3/faq/troubleshooting/
- Helm v2 `helm list` command reference: https://helm.sh/docs/v2/helm/helm_list/
- Helm v2 `helm get values` command reference: https://helm.sh/docs/v2/helm/helm_get_values/
- Helm v2 `helm get manifest` command reference: https://v2.helm.sh/docs/helm/
- Helm v2 usage and RBAC/Tiller namespace documentation: https://v2.helm.sh/docs/using_helm/
- Helm chart dependency best practices for `Chart.yaml`: https://docs.helm.sh/docs/chart_best_practices/dependencies/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD CLI `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/release-2.0/user-guide/commands/argocd_app_sync/
- Argo CD resource tracking documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/resource_tracking/
- ingress-nginx Helm chart repository documentation: https://kubernetes.github.io/ingress-nginx/
- Prometheus Community Helm charts repository: https://prometheus-community.github.io/helm-charts/
- Bitnami Helm charts repository documentation: https://bitnami.com/stack/redis/helm

## Issues Found
- Corrected the opening claim that Tiller was "deprecated in 2019" and always stored release state in `kube-system` with cluster-admin privileges. Helm v3 removed Tiller, Helm v2 has been unsupported since November 2020, and Tiller can run in a custom namespace with restricted RBAC.
- Changed the Argo CD benefits list to avoid implying Argo CD has no server-side component or cluster access. The corrected text focuses on eliminating the Tiller server-side component and storing desired state in Git.
- Updated the Helm v2 inventory example to use a `TILLER_NAMESPACE` variable and renamed the JSON output field from `version` to `appVersion` so it matches `.AppVersion`.
- Changed the sample Argo CD `Application` project from `infrastructure` to `default` so the example works without requiring a separately-created AppProject.
- Corrected the in-place migration command. `argocd app sync` does not need `--prune=false`; pruning is disabled by default unless requested.
- Updated Tiller release metadata cleanup to delete both ConfigMaps and Secrets, since Helm v2 can use either storage backend.
- Rewrote the resource metadata cleanup section. The original text used Helm 3 annotations (`meta.helm.sh/release-*`) as if they were Helm v2/Tiller metadata. The corrected section refers to common Helm v2-rendered labels such as `heritage` and `release`, with a selector safety warning.
- Updated Tiller removal and validation commands to check both ConfigMap and Secret storage and to use `TILLER_NAMESPACE` consistently.

## Review Notes
The overall migration approach is technically valid, but real migrations should test each modern chart's breaking changes carefully. The old `stable/` charts and their modern replacements often have different values schemas, labels, selectors, and resource names, so in-place adoption is only safe when rendered manifests are compatible with the existing live resources.
