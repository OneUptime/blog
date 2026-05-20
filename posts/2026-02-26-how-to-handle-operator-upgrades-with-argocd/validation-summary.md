# Validation Summary: How to Handle Operator Upgrades with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD Applications and CLI
- Argo CD sync windows
- Kubernetes CustomResourceDefinitions and conversion webhooks
- Kubernetes Operators
- kubectl
- Prometheus Operator PrometheusRule
- kube-state-metrics CustomResourceStateMetrics
- GitHub Actions and kind

## Sources Consulted
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD CLI command reference for `argocd app wait`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Kubernetes CustomResourceDefinition versioning: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics CustomResourceStateMetrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/customresourcestate-metrics.md
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- controller-runtime metrics package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/internal/controller/metrics

## Issues Found
- The Argo CD sync window example used an always-active `deny` window alongside the maintenance `allow` window. Argo CD gives deny windows precedence over allow windows, so the example would block the intended maintenance sync. I removed the deny window because a matching allow window already restricts syncs to the active maintenance period.
- The CRD rollback caveat described failure in terms of a newly required field. I changed it to the more accurate rollback risk: custom resources may have been written with a new storage version, schema, or conversion behavior, which can make downgrades fail or make older clients unable to read objects correctly.
- The monitoring example used `kube_customresource_status_condition` as if it were a built-in metric for all custom resources. kube-state-metrics requires CustomResourceStateMetrics configuration for custom resource metrics, and metric names are configuration-specific. I updated the text and changed the query to an example `myresource_status_condition` metric.

## Review Notes
The remaining examples are intentionally generic and depend on operator-specific chart values, CRD names, custom resource names, and metrics. The canary pattern is valid only for operators that support namespace-scoped watching and separate leader election or controller identity.
