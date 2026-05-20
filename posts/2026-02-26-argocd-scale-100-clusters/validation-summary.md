# Validation Summary: How to Scale ArgoCD Across 100+ Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet resources
- Argo CD Helm chart configuration
- Kubernetes Secrets and ConfigMaps
- Prometheus Operator ServiceMonitor
- kubectl
- GitOps repository layout

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Generators-Git/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD ApplicationSet template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD resource exclusion documentation: https://argo-cd.readthedocs.io/en/release-2.4/operator-manual/declarative-setup/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/metrics/
- Argo CD CLI command references for application and project listing: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_list/ and https://argo-cd.readthedocs.io/en/release-2.5/user-guide/commands/argocd_app_list/
- argoproj/argo-helm values documentation: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml

## Issues Found
- The Helm values example said it configured cluster assignments, but the snippet only configured resource sizing and runtime parameters. Updated the text to accurately describe the snippet.
- The Helm values example placed controller runtime parameters under `configs.cm`, which maps to `argocd-cm`. Moved those settings to `configs.params`, which maps to `argocd-cmd-params-cm`.
- The Helm values example used `cluster.cache.resync.duration`, which is not present in the current Argo CD command parameter reference. Replaced it with documented cluster cache batching parameters.
- The ApplicationSet example used the older fasttemplate style, which Argo CD documentation says will be deprecated in favor of Go Template. Enabled `goTemplate`, added `goTemplateOptions`, and updated the path variables to the documented Go Template forms.
- The ApplicationSet template omitted `spec.project`, which generated Applications need. Added `project: default`.
- The ApplicationSet destination server was missing a URL scheme. Updated it to use an HTTPS URL.
- The `reposerver.enable.git.submodule` setting was described as request deduplication. Corrected the comment to say it disables Git submodule processing.
- The backup commands used `argocd app list` and `argocd proj list`, which are list commands and are not the best way to export full Kubernetes resources. Replaced them with `kubectl get applications.argoproj.io` and `kubectl get appprojects.argoproj.io`.

## Review Notes
The scale recommendations are operational guidance rather than hard Argo CD limits. Actual safe cluster and application counts depend on application count, resource count, enabled resource types, repo-server workload, Kubernetes API latency, and controller sizing.
