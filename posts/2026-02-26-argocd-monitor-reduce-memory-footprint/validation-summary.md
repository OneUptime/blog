# Validation Summary: How to Monitor and Reduce ArgoCD Memory Footprint

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- Grafana
- Redis
- Docker container images

## Sources Consulted
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/metrics/
- Argo CD high availability and controller sharding documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD dynamic cluster distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD repo server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD declarative setup resource exclusions documentation: https://argo-cd.readthedocs.io/en/release-2.11/operator-manual/declarative-setup/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Kubernetes emptyDir volume documentation: https://kubernetes.io/docs/concepts/storage/volumes/#emptydir
- Redis key eviction documentation: https://redis.io/docs/latest/develop/reference/eviction/

## Issues Found
- The ServiceMonitor example selected all Argo CD services by `app.kubernetes.io/part-of: argocd`, but Argo CD's documented Prometheus Operator examples use separate ServiceMonitors with component-specific `app.kubernetes.io/name` selectors. Changed the example to a valid application-controller metrics ServiceMonitor.
- The memory percentage PromQL divided cAdvisor metrics without aligning labels, which can produce no series or incorrect matching. Rewrote the query and alert expression to aggregate by `pod` and `container` before division and to ignore empty/POD pseudo-containers.
- The post described controller sharding as distributing applications directly. Argo CD sharding distributes clusters across controller replicas, so applications are distributed only according to their destination clusters. Updated the explanation, sizing example, and summary.
- The resource caching section described resource exclusions as app-specific and suitable for non-critical apps. Argo CD `resource.exclusions` is global by resource type and cluster. Updated the heading and wording to describe global high-churn resource type exclusions.
- The app resource-count command used a non-existent `argocd app get --show-resources` flag. Replaced it with the documented `argocd app resources my-app`.
- The repo server example used `--parallelism-limit`, but the documented repo-server flag is `--parallelismlimit`. Updated the snippet.
- The clone cache section claimed repo server automatically evicts old clones when space is needed. The official docs describe repo-server local clones and cache expiration, not disk-pressure clone eviction. Reworded this to focus on limiting temporary storage with `emptyDir.sizeLimit`.
- The custom plugin image section implied smaller base images directly reduce container runtime memory overhead. Reworded it to distinguish disk/pull-time benefits from memory savings caused by fewer tools and processes during manifest generation.
- The Redis example claimed `--rdbcompression=yes` compresses large in-memory values. Redis RDB compression applies to persistence snapshots, not live cache value compression. Removed that argument and adjusted the eviction explanation.
- The memory-per-application PromQL divided controller memory by `argocd_app_info` directly, which is invalid for this purpose. Replaced it with controller memory divided by `count(argocd_app_info)`.

## Review Notes
The sizing numbers remain heuristic guidance rather than guarantees. Actual Argo CD memory use depends heavily on cluster count, resource count, repository layout, manifest-generation tools, plugin behavior, and enabled metrics cardinality.
