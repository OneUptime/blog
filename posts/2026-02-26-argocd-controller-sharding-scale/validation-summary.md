# Validation Summary: How to Configure Controller Sharding for Scale in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD application controller
- Argo CD controller sharding
- Kubernetes StatefulSet and Secret manifests
- Prometheus metrics and PrometheusRule alerts
- kubectl commands

## Sources Consulted
- Argo CD official High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD official metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD official dynamic cluster distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- Argo CD official `argocd-cmd-params-cm` example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD upstream source for sharding algorithms: https://github.com/argoproj/argo-cd/blob/master/controller/sharding/sharding.go
- Argo CD upstream source for cluster metrics labels: https://github.com/argoproj/argo-cd/blob/master/controller/metrics/clustercollector.go
- Red Hat OpenShift GitOps sharding documentation for log verification examples: https://docs.redhat.com/en/documentation/red_hat_openshift_gitops/1.15/html/declarative_cluster_configuration/sharding-clusters-across-argo-cd-application-controller-replicas

## Issues Found
- The legacy sharding algorithm was described as using the cluster index in a sorted list. Argo CD currently describes and implements legacy sharding as a hash of the cluster ID modulo the shard count, with potentially uneven distribution. Updated the description.
- The round-robin algorithm description was too vague. Updated it to match the implementation: cluster rank in the UID-sorted list modulo the shard count.
- The consistent hashing description did not mention bounded loads. Updated it to match Argo CD's documented and implemented algorithm.
- The post recommended consistent hashing broadly for production, but current Argo CD documentation marks both round-robin and consistent hashing as experimental/alpha. Reworded the recommendation to include that caveat.
- Processor count settings were shown in `argocd-cm`. These controller startup parameters belong in `argocd-cmd-params-cm`. Updated the ConfigMap name.
- The log-verification command grepped for `"assigned"`, which does not match the documented debug log text. Updated it to grep for `"processed by shard"` and noted that debug logging is needed.
- Manual shard assignment was shown as an `argocd.argoproj.io/shard` annotation. Argo CD uses the optional `shard` field in the cluster secret data. Updated the Secret example and explanatory text.
- The uneven-cluster section said consistent hashing distributes only by cluster count. The current implementation uses bounded loads and considers application distribution, though it still does not fully account for resource-level workload. Updated the explanation.
- The scaling section stated an exact `1/new_shard_count` movement rule. Reworded it as an approximate outcome because actual movement depends on the existing cluster and application distribution.
- The Prometheus imbalance alert used a nonexistent `shard` label on `argocd_cluster_info`. Updated it to count `argocd_cluster_info` series by scraped controller `pod`.

## Review Notes
- The resource sizing formula is a heuristic rather than an official Argo CD rule. It is acceptable as practical guidance, but readers should validate it against their own workload metrics.
- The Prometheus alert assumes Kubernetes service discovery adds a `pod` label to scraped controller metrics. Some Prometheus setups may need to adapt the label to `instance` or another scrape label.
