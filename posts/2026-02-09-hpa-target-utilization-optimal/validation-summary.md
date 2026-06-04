# Validation Summary: How to Configure HPA Target Utilization for Optimal Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- Kubernetes resource, pod, and custom metrics
- kubectl commands
- Metrics Server / metrics.k8s.io
- k6 load testing
- hey HTTP load generator
- jq
- Python pandas

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 HorizontalPodAutoscaler API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes HPA walkthrough and metrics examples: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Grafana k6 options reference: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- Grafana k6 running k6 guide: https://grafana.com/docs/k6/latest/get-started/running-k6/
- hey official GitHub README: https://github.com/rakyll/hey

## Issues Found
- The HPA replica calculation omitted the ceiling operation and said 10 pods at 80% utilization with a 70% target would become approximately 11 pods. Kubernetes documents the formula as `ceil(currentReplicas * currentMetricValue / desiredMetricValue)`, so the example was corrected to round up to 12 pods.
- The `hey` load test loop used `-q $rps -c 50` while describing `$rps` as total requests per second. The official `hey` README defines `-q` as QPS per worker, so the command was updated to divide the target RPS by the concurrency before passing it to `-q`.
- The statement that targeting 50% CPU utilization "doubles your capacity headroom" was too imprecise. It was revised to say that it leaves roughly half of requested CPU capacity as headroom.
- The statement that memory targets must be conservative because "you can't recover from OOM kills" was too absolute. It was revised to accurately state that OOM kills interrupt work and restart pods.
- The statement that latency-based scaling "ensures" performance regardless of CPU utilization was too strong. It was revised to say it helps when CPU is not the best capacity signal.
- The event-check command filtered by `involvedObject.name=web-app`, which can miss OOM and liveness probe events because those events are typically attached to individual Pods with generated names. It was changed to filter Pod events by kind and then grep for relevant failure terms.

## Review Notes
The Kubernetes HPA examples use the current stable `autoscaling/v2` API and valid `metrics`, `behavior`, `scaleUp`, and `scaleDown` fields. The custom Pods metric example is syntactically valid, but it depends on a correctly configured custom metrics adapter exposing the named metric. `kubectl top` examples require Metrics Server or another provider for `metrics.k8s.io`.
