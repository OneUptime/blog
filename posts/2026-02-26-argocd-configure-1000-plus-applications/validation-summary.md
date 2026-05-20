# Validation Summary: How to Configure ArgoCD for 1000+ Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD Helm chart
- Kubernetes
- ApplicationSet
- Redis HA
- Prometheus alerting
- Git webhooks

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Dynamic Cluster Distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD Webhook Configuration documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD ApplicationSet Go Template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/GoTemplate/
- Argo CD command parameters reference: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/argocd-cmd-params-cm.yaml
- Argo CD configuration reference: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/argocd-cm.yaml
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Argo CD metrics source and metrics documentation: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/metrics.md

## Issues Found
- The Helm values enabled dynamic cluster distribution using an unsupported `configs.params` key. Changed it to the current argo-helm value `controller.dynamicClusterDistribution: true`.
- The Helm values manually set `ARGOCD_CONTROLLER_REPLICAS`, which the chart already sets for StatefulSet sharding and does not use for dynamic cluster distribution. Removed the manual environment variable from the values example.
- The Kubernetes client rate-limit parameters used outdated or incorrect names. Changed `controller.k8s.client.config.qps` and `controller.k8s.client.config.burst` to `controller.k8s.client.qps` and `controller.k8s.client.burst`.
- Manual cluster shard assignment was shown as an annotation. Argo CD documents this as the `shard` field in the cluster secret data, so the example now uses `stringData.shard`.
- The reconciliation default was described as `180s`. Current Argo CD defaults to `120s` plus up to `60s` jitter, so the comment was corrected.
- The webhook secret was shown in `argocd-cm`. Argo CD expects provider webhook secrets in `argocd-secret`, so the snippet was changed to a Secret with `stringData`.
- The webhook section said Argo CD only reconciles when Git changes occur. Webhooks trigger immediate refreshes but periodic polling is still controlled by `timeout.reconciliation`, so the wording was corrected.
- The Prometheus shard imbalance alert used invalid PromQL aggregation syntax and an incorrect metric name. Changed it to aggregate the current `argocd_cluster_api_resources` metric by scraped controller pod.

## Review Notes
The sizing recommendations are workload-dependent and should be treated as starting points rather than universal minimums. Dynamic cluster distribution is still documented as an alpha feature, so operators should verify compatibility with their Argo CD and argo-helm chart versions before relying on it for autoscaling.
