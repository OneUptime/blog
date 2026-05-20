# Validation Summary: How to Distribute Clusters Across Controller Shards in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD application controller sharding
- Argo CD cluster secrets and CLI
- Kubernetes StatefulSet and Secret manifests
- Prometheus Operator ServiceMonitor
- Prometheus metrics and PromQL

## Sources Consulted
- Argo CD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD Dynamic Cluster Distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD Declarative Setup cluster secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#clusters
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd cluster set` command reference: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/commands/argocd_cluster_set/
- Argo CD v2.12 cluster source for `shard` secret data handling: https://github.com/argoproj/argo-cd/blob/release-2.12/util/db/cluster.go
- Argo CD application controller source for `--sharding-method`: https://github.com/argoproj/argo-cd/blob/release-2.12/cmd/argocd-application-controller/commands/argocd_application_controller.go
- Argo CD release information: https://github.com/argoproj/argo-cd/releases

## Issues Found
- The post described static shard assignment as the `argocd.argoproj.io/shard` annotation. Argo CD stores explicit cluster shard assignment in the cluster object's `shard` field, backed by the cluster Secret data key `shard`. Updated the Secret example and verification command to use `stringData.shard` / `.data.shard`.
- The post used `argocd cluster set ... --shard`, but the official `cluster set` command does not expose a `--shard` option. Updated the example to use `argocd cluster add ... --shard`, which is supported.
- The post implied dynamic sharding writes shard annotations automatically. Argo CD normally calculates shard assignment at runtime when the `shard` field is omitted. Updated the explanation to distinguish automatic sharding from the alpha dynamic cluster distribution feature.
- The StatefulSet section said it applied regardless of dynamic distribution. Official dynamic cluster distribution uses the controller Deployment overlay and does not rely on `ARGOCD_CONTROLLER_REPLICAS`. Updated the wording to scope the StatefulSet snippet to standard StatefulSet-based sharding.
- The ServiceMonitor selected `app.kubernetes.io/name: argocd-application-controller`, but Argo CD's controller metrics Service is labeled `app.kubernetes.io/name: argocd-metrics`. Updated the selector and comment.
- The in-cluster static assignment example used unsupported `argocd cluster set --shard`. Updated it to register the in-cluster endpoint with `argocd cluster add --in-cluster --shard`.
- The image tag in the StatefulSet example used the old `v2.12.0` tag. Updated it to the current Argo CD release shown by GitHub releases at review time, `v3.4.1`.
- The log verification example searched for a generic `Processing` string. Updated it to search for the Argo CD sharding log phrase `assigned to shard`.

## Review Notes
The shard-count guidance is heuristic rather than an official sizing rule, but it is framed as a starting point and tells readers to monitor and adjust. Dynamic cluster distribution remains alpha in the official documentation, so the post now avoids presenting it as the default recommendation.
