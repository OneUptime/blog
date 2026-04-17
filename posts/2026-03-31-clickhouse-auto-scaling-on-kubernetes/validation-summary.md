# Validation Summary: How to Set Up ClickHouse Auto-Scaling on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- Kubernetes (StatefulSets)
- Horizontal Pod Autoscaler (HPA, autoscaling/v2)
- Vertical Pod Autoscaler (VPA, autoscaling.k8s.io/v1)
- KEDA (keda.sh/v1alpha1, ScaledObject, Prometheus scaler)
- metrics-server
- Helm
- Prometheus

## Sources Consulted
- Kubernetes HPA reference (autoscaling/v2): https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- metrics-server releases: https://github.com/kubernetes-sigs/metrics-server
- VPA repo and hack scripts: https://github.com/kubernetes/autoscaler/tree/master/vertical-pod-autoscaler/hack
- KEDA ScaledObject spec: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- KEDA Prometheus scaler (current): https://keda.sh/docs/2.13/scalers/prometheus/
- KEDA Prometheus scaler (v2.10 deprecation note): https://keda.sh/docs/2.10/scalers/prometheus/
- KEDA install via Helm: https://keda.sh/docs/latest/deploy/

## Issues Found
1. **VPA install script name was wrong.** The post referenced `./hack/vpa-install.sh`, which does not exist in the kubernetes/autoscaler repo. The actual install script is `./hack/vpa-up.sh` (with `vpa-down.sh` as its counterpart). Fixed.
2. **KEDA ScaledObject `scaleTargetRef` did not specify `kind`.** When `kind` is omitted it defaults to `Deployment`, but ClickHouse runs as a `StatefulSet` (as the post itself notes). Added `apiVersion: apps/v1` and `kind: StatefulSet` so the ScaledObject actually targets the StatefulSet.
3. **KEDA Prometheus trigger used the deprecated `metricName` field.** `metricName` was deprecated in KEDA v2.10 and removed in v2.12; it is not part of the current Prometheus scaler spec. Removed it from the trigger metadata.

## Review Notes
- The HPA YAML (`autoscaling/v2`, `Resource` metrics for CPU and memory with `Utilization` targets) is correct and current.
- HPA scaling a StatefulSet is supported, but as the post correctly notes, horizontally scaling ClickHouse requires pre-configured replication / sharding and ZooKeeper (or ClickHouse Keeper) to be useful — simply adding pods does not redistribute data.
- VPA `updateMode: "Auto"` will evict pods to apply new resource recommendations; on a stateful workload like ClickHouse this can be disruptive. Operators may prefer `updateMode: "Initial"` or `"Off"` (recommendation-only) in production. Left as-is since it is technically valid.
- Combining VPA in `Auto` mode with an HPA that scales on CPU/memory on the same workload is generally discouraged by the VPA project; users should either use VPA on non-CPU/memory metrics or run VPA in recommendation mode alongside HPA. Not flagged inline since the post presents the three options as alternatives.
- The metrics-server install URL using `releases/latest/download/components.yaml` is a valid convenience pattern published by the metrics-server project.
