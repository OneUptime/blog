# Validation Summary: How to Handle Sidecar Container Resource Requests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar injection
- IstioOperator configuration
- Istio proxy annotations
- Kubernetes resource requests and limits
- Kubernetes pod QoS and scheduling
- Vertical Pod Autoscaler
- Prometheus container metrics

## Sources Consulted
- Istio resource annotation reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio sidecar injection customization docs: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio performance and scalability docs: https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio default Helm values: https://raw.githubusercontent.com/istio/istio/master/manifests/charts/istio-control/istio-discovery/values.yaml
- Kubernetes resource management docs: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes pod QoS docs: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Vertical Pod Autoscaler docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- VPA API reference package: https://pkg.go.dev/k8s.io/autoscaler/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1

## Issues Found
- The post said Kubernetes treats a sidecar with no resource requests as a "best-effort container" that can get killed first under memory pressure. Kubernetes assigns QoS at the pod level, not the container level, and pod eviction behavior depends on requests and limits across all containers. Updated the text to describe the lack of reserved resources and pod-level QoS behavior accurately.
- The CPU Prometheus query used the raw `container_cpu_usage_seconds_total` counter. Updated it to use `rate(...[5m])`, which is the correct way to query CPU usage from that counter.
- The post said Istio defaults proxy `concurrency` to 2. Current Istio ProxyConfig documentation says an unset value is automatically determined based on CPU limits. Updated the text to explain the current behavior.
- The CPU throttling guidance referenced the raw `container_cpu_cfs_throttled_seconds_total` counter. Updated it to use a rate query.
- The OOMKilled example used an event field selector for `reason=OOMKilling`, which is not the most reliable way to confirm container OOM termination status. Updated the example to use `kubectl describe pod`, where Kubernetes reports container `Last State` and `Reason: OOMKilled`.

## Review Notes
The Istio resource annotations in the post are currently documented as alpha annotations but are valid. The default sidecar resource example matches the current upstream Istio default Helm values at the time of review.
