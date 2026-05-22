# Validation Summary: How to Configure Horizontal Pod Autoscaler for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes custom metrics API
- Istio and IstioOperator
- Istio standard telemetry metrics
- Prometheus Adapter
- KEDA Prometheus scaler

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HorizontalPodAutoscaler walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Istio installation customization documentation: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio standard metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- Istio sidecar injection troubleshooting documentation: https://istio.io/latest/docs/ops/common-problems/injection/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.19/scalers/prometheus/

## Issues Found
- The request-per-second HPA examples used an Object metric target of `Value` while the surrounding text described a per-pod threshold. Kubernetes HPA only divides an Object metric by pod count when `AverageValue` is used, so both request-rate examples were changed to `type: AverageValue` with `averageValue: 100`.
- The KEDA Prometheus scaler example included `metricName`, which is not listed in the latest KEDA Prometheus scaler metadata. The field was removed to match the current documentation.
- The Prometheus Adapter latency rule matched `destination_service_namespace` but did not require `destination_service_name`, even though the metric was associated with Service objects. The `seriesQuery` was tightened to require both labels.

## Review Notes
- The HPA resource utilization examples require CPU and memory requests on the target pods; otherwise those utilization metrics may be unavailable to the HPA.
- `kubectl` was not installed in the local environment, so command verification was done against Kubernetes documentation rather than local `kubectl --help` output.
