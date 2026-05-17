# Validation Summary: How to Configure Metrics Server on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Metrics Server (v0.7.0)
- Helm
- Horizontal Pod Autoscaler (HPA) — autoscaling/v2 API
- kubectl
- Prometheus / ServiceMonitor (Prometheus Operator)
- Talos machine config inline manifests

## Sources Consulted
- metrics-server upstream repository: https://github.com/kubernetes-sigs/metrics-server
- metrics-server Helm chart values.yaml: https://github.com/kubernetes-sigs/metrics-server/blob/master/charts/metrics-server/values.yaml
- metrics-server Dockerfile (confirms distroless base image): https://github.com/kubernetes-sigs/metrics-server/blob/master/Dockerfile
- metrics-server PR #1054 (default `--secure-port` changed to 10250): https://github.com/kubernetes-sigs/metrics-server/pull/1054
- metrics-server APIService manifest: https://github.com/kubernetes-sigs/metrics-server/blob/master/manifests/base/apiservice.yaml
- Kubernetes HPA documentation (autoscaling/v2 GA since 1.23): https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Talos Linux documentation: https://www.talos.dev/

## Issues Found

1. **Troubleshooting command used `kubectl exec` with `wget` into the metrics-server pod.** The metrics-server container image is built on `gcr.io/distroless/static` and does not contain a shell, wget, or any other utility — only the `metrics-server` binary. The original command (`kubectl exec -n kube-system deploy/metrics-server -- wget -qO- --no-check-certificate https://10.0.0.10:10250/metrics/resource`) would fail with `exec: "wget": executable file not found in $PATH`. Replaced it with `kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes`, which queries the Metrics API directly and is a more reliable, in-cluster way to verify metrics collection. Added a brief note explaining that the metrics-server image is distroless so `kubectl exec` is not an option.

## Review Notes
- All Helm chart values (`args`, `resources`, `tolerations`, `replicas`, `podDisruptionBudget`, `updateStrategy`, `serviceMonitor`, `affinity`, `topologySpreadConstraints`) are valid in the upstream `kubernetes-sigs/metrics-server` chart.
- All metrics-server CLI flags shown (`--kubelet-insecure-tls`, `--kubelet-preferred-address-types`, `--metric-resolution`) are valid.
- `containerPort: 10250` for metrics-server is correct as of v0.7.x (the default `--secure-port` was changed from 4443 to 10250 in PR #1054).
- `apiVersion: autoscaling/v2` for HPA is correct (GA since Kubernetes 1.23).
- APIService name `v1beta1.metrics.k8s.io` is correct.
- Prometheus metric names `metrics_server_kubelet_request_duration_seconds` and `metrics_server_kubelet_request_total` are real metrics exposed by metrics-server.
- The "Alternative Installation via Talos Machine Config" example is intentionally abbreviated — it shows only ServiceAccount and Deployment and omits the ClusterRole, ClusterRoleBinding, Service, and APIService that a full deployment requires. It is presented as an illustrative snippet, not a production-ready manifest, so it was left as-is.
- v0.7.0 is a valid release of metrics-server (Feb 2024) but is not the latest as of the post date; readers may want to consult the upstream releases page for newer patches.
