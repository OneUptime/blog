# Validation Summary: How to Handle VPA and HPA Together for CPU and Memory Autoscaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler (HPA)
- Kubernetes Vertical Pod Autoscaler (VPA)
- Kubernetes resource requests and limits
- Kubernetes custom metrics
- KEDA ScaledObject and Prometheus scaler
- kubectl

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA known limitations: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md
- Kubernetes autoscaler VPA API reference: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md
- kubectl set resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- KEDA ScaledObject specification: https://keda.sh/docs/latest/reference/scaledobject-spec/
- KEDA Prometheus scaler documentation: https://keda.sh/docs/latest/scalers/prometheus/

## Issues Found
1. **Overbroad VPA/HPA compatibility wording.** The post said to always use VPA `Off` or `Initial` with HPA and never `Auto`. Current VPA documentation says VPA should not be used with HPA on the same resource metric, but separate resource metrics and HPA custom/external metrics are supported. I changed the wording to recommend `Off` or `Initial` for low-disruption setups, to avoid deprecated `Auto`, and to use explicit update modes only when the autoscalers do not target the same resource metric.
2. **Deprecated VPA `Auto` mode not identified accurately.** Current VPA documentation marks `Auto` as deprecated and equivalent to `Recreate` for now. I updated comments and best-practice wording to call out the deprecation and prefer explicit update modes.
3. **Deprecated event sorting field.** The post used `kubectl get events --sort-by='.lastTimestamp'`. The Kubernetes quick reference uses `.metadata.creationTimestamp`, so I updated the command.
4. **Invalid anti-pattern manifests.** The "Both on CPU" anti-pattern omitted required HPA fields (`scaleTargetRef`, `maxReplicas`) and VPA `targetRef`, which made the example invalid for reasons unrelated to the stated anti-pattern. I added the required fields while preserving the CPU conflict.
5. **Outdated KEDA Prometheus trigger field.** The KEDA example included `metricName`, which was deprecated in older KEDA releases and is absent from current Prometheus scaler documentation. I removed it.
6. **KEDA Prometheus query shape.** Current KEDA documentation notes that Prometheus queries should return a single vector/scalar element. I changed `rate(http_requests_total[1m])` to `sum(rate(http_requests_total[1m]))`.
7. **KEDA positioning.** The post framed KEDA as a better general separation of concerns than HPA+VPA. Since KEDA handles event-driven horizontal scaling and does not replace VPA resource sizing, I narrowed the wording to complex horizontal scaling and event-driven scaling separation.

## Review Notes
kubectl was not installed in the local environment, so CLI command validation was performed against the official Kubernetes command references rather than local `kubectl --help` output. The remaining HPA and VPA manifests use current API versions and fields, but actual custom metric examples require a configured metrics adapter in the target cluster.
