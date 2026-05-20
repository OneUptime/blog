# Validation Summary: How to Reduce ArgoCD Controller Memory Usage

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ArgoCD application controller
- Kubernetes workloads, resources, metrics, and ConfigMaps
- ArgoCD controller sharding and dynamic cluster distribution
- ArgoCD resource exclusions and inclusions
- Go runtime garbage collection tuning
- Redis
- Prometheus and kube-state-metrics alerting

## Sources Consulted
- ArgoCD High Availability documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- ArgoCD Dynamic Cluster Distribution documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/dynamic-cluster-distribution/
- ArgoCD Declarative Setup resource inclusion/exclusion documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- ArgoCD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/release-2.8/operator-manual/argocd-cmd-params-cm-yaml/
- ArgoCD AppProject specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- ArgoCD CLI command reference for `argocd app list`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Go runtime environment variable documentation: https://pkg.go.dev/runtime
- Go garbage collector guide: https://go.dev/doc/gc-guide
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
- The post described controller sharding as splitting applications across replicas. ArgoCD controller sharding assigns managed clusters to shards, so I changed the wording and caveats to make clear that this helps multi-cluster installations and does not split applications within a single cluster.
- The post presented dynamic sharding without noting its stability. I added a note that `round-robin`, `consistent-hashing`, and dynamic cluster distribution are alpha features in current ArgoCD documentation.
- The post used AppProject `clusterResourceWhitelist` and `clusterResourceBlacklist` as a way to reduce controller resource tracking. Those fields control what applications may deploy, not what the controller watches. I replaced the snippet with `resource.inclusions` in `argocd-cm` and added an audit warning.
- The Redis section implied Redis reduces the controller's own in-memory cache. ArgoCD uses Redis as a disposable cache, but the controller still keeps its Kubernetes cluster cache in memory. I corrected the explanation.
- The reconciliation interval example used `"600"`. Current ArgoCD documentation describes `timeout.reconciliation` as a duration string, so I changed it to `"10m"`.
- The OOM alert used restarts alone as a proxy for OOM kills. I added `kube_pod_container_status_last_terminated_reason{reason="OOMKilled"}` with explicit vector matching so the alert is specific to OOM kills.
- The pprof example used port 6060 and port-forwarded the controller Deployment. ArgoCD documents profiling on the component metrics port after enabling `controller.profile.enabled`, so I changed the example to use `svc/argocd-metrics` on port 8082.

## Review Notes
Several memory-saving percentages in the post are workload-dependent estimates rather than documented guarantees. They are plausible as examples but should be treated as approximate sizing guidance, not fixed expected outcomes.
