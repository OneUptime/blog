# Validation Summary: How to Scale ArgoCD Across 10+ Clusters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- Kubernetes
- Helm
- External Secrets Operator
- Prometheus/PromQL
- Grafana Loki Helm charts
- kube-prometheus-stack Helm chart

## Sources Consulted
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD declarative cluster setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD ApplicationSet cluster generator: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet generators and matrix generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators/
- Argo CD multiple sources and Helm values files: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/multiple_sources/
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD high availability and controller sharding: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD command parameters ConfigMap: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD metrics: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/metrics/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator templating: https://external-secrets.io/main/guides/templating/
- Prometheus Community Helm charts: https://github.com/prometheus-community/helm-charts
- Grafana Loki Helm install documentation: https://grafana.com/docs/loki/latest/setup/install/helm/

## Issues Found
- The `argocd cluster add` examples used names that could be mistaken for cluster names, but the command takes kubeconfig context names. Updated the examples to use explicit `*-context` arguments with `--name`.
- The ExternalSecret example used `external-secrets.io/v1beta1`, while current External Secrets Operator documentation uses `external-secrets.io/v1`. Updated the API version and made `engineVersion: v2` explicit.
- The matrix generator example used `loki-stack` from the Prometheus Community Helm repository. Loki charts are not in that repository, and current Grafana documentation points to the Grafana Community Helm repository. Updated the list elements to include per-chart `repoURL`, changed Loki to the current `loki` chart, and used version `6.x`.
- The RBAC section said it controlled deployment to clusters directly. Argo CD RBAC application objects are project/application scoped, while cluster destination restrictions are enforced through AppProjects. Updated the wording and comments to reflect that.
- The controller sharding example used a non-existent `argocd.argoproj.io/shard` annotation. Argo CD documents `shard` as a cluster secret data field. Updated the snippet to set `stringData.shard`.
- The "Cluster Connection Pooling" section described QPS/burst settings as connection limits. These settings tune Kubernetes client request rate, so the heading and comment were corrected.
- The monitoring examples used `argocd_cluster_info` and `connection_state` for connection status. Argo CD exposes `argocd_cluster_connection_status`; updated the dashboard query and alert expression to use `connection_status`.
- The high-sync-failure alert was actually measuring the percentage of OutOfSync applications. Renamed it to `ClusterHighOutOfSync`.
- The DR Application example used unsupported annotation `argocd.argoproj.io/sync-policy: none`. Removed it and noted that omitting `spec.syncPolicy.automated` keeps the Application from auto-syncing.

## Review Notes
- The ApplicationSet examples use the default fasttemplate-style placeholders (`{{name}}`, `{{server}}`), which remain supported. Argo CD also supports Go templates via `goTemplate: true`; future updates could adopt Go templates for stricter missing-key behavior.
- The resource sizing guidance is reasonable as illustrative guidance, but real sizing should be load tested against the number of applications, repository size, manifest generation cost, and Kubernetes API server latency.
