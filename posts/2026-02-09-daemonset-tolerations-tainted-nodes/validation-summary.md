# Validation Summary: How to Configure DaemonSet Tolerations for Running on Tainted Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes DaemonSets
- Kubernetes taints and tolerations
- kubectl taint commands
- MutatingAdmissionWebhook configuration
- Go Kubernetes API types
- Prometheus alerting with kube-state-metrics

## Sources Consulted
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes taints and tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- kubectl taint reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Kubernetes well-known labels, annotations, and taints: https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes image registry migration notice: https://kubernetes.io/blog/2023/02/06/k8s-gcr-io-freeze-announcement/
- kube-state-metrics node metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The introduction and taints explanation overstated DaemonSet behavior and NoExecute effects. Updated the wording to say DaemonSets often need to run on every eligible node, and that NoExecute evicts pods that do not tolerate the taint.
- The post did not mention Kubernetes' automatic DaemonSet tolerations. Added a clarification that Kubernetes automatically adds several condition-related tolerations to DaemonSet Pods, while explicit tolerations are still needed for control plane, GPU, and custom taints.
- The kube-proxy image used the deprecated `k8s.gcr.io` registry. Updated it to `registry.k8s.io`.
- The NoExecute example used `node.kubernetes.io/disk-pressure` with the `NoExecute` effect, but Kubernetes uses `NoSchedule` for that well-known condition taint. Replaced it with a custom `maintenance` NoExecute taint.
- The maintenance section placed YAML inside a `bash` code fence. Split the command and DaemonSet manifest into separate `bash` and `yaml` blocks.
- The Go webhook snippet imported packages that were not used, which would prevent compilation. Removed the unused imports and adjusted the comment to avoid implying the function only targets DaemonSet Pods.
- The Prometheus alert examples compared total tainted nodes to total DaemonSet Pods and inferred control plane nodes from node names. Replaced them with node-based `unless` expressions using kube-state-metrics labels.
- Updated "master node" wording to current "control plane node" terminology while keeping the deprecated `node-role.kubernetes.io/master` toleration for compatibility with older clusters.

## Review Notes
`kubectl` was not installed in the local environment, so CLI behavior was verified against the official kubectl reference rather than local `kubectl --help` output. Ruby and YAML parsing libraries were also unavailable locally, so YAML snippets were reviewed manually against Kubernetes API fields and official documentation.
