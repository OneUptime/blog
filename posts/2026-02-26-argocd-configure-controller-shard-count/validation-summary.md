# Validation Summary: How to Configure Controller Shard Count in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD application controller
- Argo CD static cluster sharding
- Argo CD dynamic cluster distribution
- Kubernetes StatefulSet
- Kubernetes kubectl
- Helm chart values
- Kustomize patches
- Prometheus metrics

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Dynamic Cluster Distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD `argocd admin cluster stats` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_cluster_stats/
- Argo CD v2.12 HA install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/v2.12.0/manifests/ha/install.yaml
- Argo CD v2.12 controller source for workqueue and reconciliation metrics: https://github.com/argoproj/argo-cd/tree/v2.12.0/controller
- Argo CD Helm chart README and values: https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd

## Issues Found
- The controller log command used `deployment/argocd-application-controller`, but the post is configuring static StatefulSet-based sharding. Changed it to `statefulset/argocd-application-controller`.
- The sharding formula implied a fixed `hash(cluster) % replicas` algorithm. Argo CD supports configured sharding algorithms and uses the pod ordinal for static sharding. Reworded the example to describe assigned shards without claiming a single algorithm.
- The Helm snippet set `ARGOCD_CONTROLLER_REPLICAS` manually and used a non-existent `controller.statefulset.enabled` value. The current argo-cd Helm chart derives `ARGOCD_CONTROLLER_REPLICAS` from `controller.replicas` and uses StatefulSet mode when `controller.dynamicClusterDistribution` is false. Updated the snippet accordingly.
- The Kustomize JSON patch targeted `/env/0/value`, which is not `ARGOCD_CONTROLLER_REPLICAS` in the Argo CD v2.12 HA manifest. Replaced it with a strategic merge patch keyed by container and env var name.
- The shard-count change process updated the env var and replica count in separate commands, creating a transient mismatch. Replaced this with a single strategic `kubectl patch` that updates both values together.
- The verification commands attempted to read `argocd.argoproj.io/shard` annotations from cluster Secrets. Argo CD stores manually assigned shard values in the cluster Secret data and computes inferred shard placement internally. Replaced those checks with `argocd admin cluster stats`.
- The common-mistakes section said Deployments do not work for sharding without noting Argo CD's alpha dynamic cluster distribution mode. Qualified the warning as specific to static sharding and referenced dynamic cluster distribution.

## Review Notes
The sizing thresholds and alert levels are practical heuristics rather than official Argo CD limits. They remain acceptable as starting guidance, but future revisions should label them clearly as environment-dependent and validate them against production measurements.
