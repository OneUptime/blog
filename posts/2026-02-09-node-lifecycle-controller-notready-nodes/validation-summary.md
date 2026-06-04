# Validation Summary: How to Use Node Lifecycle Controller to Handle NotReady Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes node lifecycle controller
- Kubernetes taints and tolerations
- Kubernetes taint-based eviction
- kube-controller-manager
- kube-apiserver
- kubectl
- Go client-go
- PrometheusRule / kube-state-metrics
- Linux systemd and node recovery DaemonSets

## Sources Consulted
- Kubernetes Nodes documentation: https://kubernetes.io/docs/concepts/architecture/nodes/
- Kubernetes Taints and Tolerations documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kube-controller-manager reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes Admission Controllers documentation: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes Node API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/
- Kubernetes Toleration API reference: https://kubernetes.io/docs/reference/kubernetes-api/definitions/toleration-v1/
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics node metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- Go package documentation for client-go Kubernetes client: https://pkg.go.dev/k8s.io/client-go/kubernetes

## Issues Found
- The post described taint-based pod eviction as part of the node lifecycle controller. Kubernetes 1.29 and later moved taint-based eviction into the separate `taint-eviction-controller`, so the introduction was updated to reflect current behavior.
- The post claimed `node.kubernetes.io/not-ready:NoExecute` prevents new pod scheduling. `NoExecute` controls eviction of already-bound pods, while node-condition `NoSchedule` taints affect scheduling, so the explanation was corrected.
- The controller-manager example used `--pod-eviction-timeout`, which is not present in the current official `kube-controller-manager` reference. The example was changed to use API server default toleration flags and per-pod `tolerationSeconds`.
- The node monitor grace period default was listed as `40s`. Current official Kubernetes documentation lists `--node-monitor-grace-period` default as `50s`, so the snippet was updated.
- The text said a 30-second pod toleration evicts the pod after the node becomes NotReady regardless of the global timeout. This was updated to say eviction happens after the matching `NoExecute` taint is added, regardless of the API server default toleration duration.
- The Go controller sample called `log.Printf` without importing `log`. The missing import was added.
- The Go controller sample appended the same custom taint every time it observed the node as NotReady. A check was added to avoid repeatedly adding duplicate custom taints.
- The node recovery DaemonSet ran `systemctl`, `df`, `docker`, and `journalctl` from the container context and mounted Docker-specific paths. The command was updated to use `nsenter` into the host namespaces and to try `crictl` before Docker, and the Docker hostPath mounts were removed.

## Review Notes
The post is now accurate for current upstream Kubernetes behavior. Local `gofmt` and `kubectl --help` checks could not be run because those binaries are not installed in this workspace; the affected Go and kubectl examples were reviewed against official documentation instead.
