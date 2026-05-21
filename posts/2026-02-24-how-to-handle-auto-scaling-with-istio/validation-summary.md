# Validation Summary: How to Handle Auto-Scaling with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Deployments, probes, lifecycle hooks, and PodDisruptionBudgets
- Istio sidecar injection, sidecar resource annotations, telemetry metrics, and DestinationRule circuit breaking
- Prometheus Adapter
- KEDA Prometheus scaler
- Helm

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes Pod Disruptions and PodDisruptionBudgets: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes Configure PodDisruptionBudget: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Circuit Breaking: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- Prometheus Adapter project documentation: https://github.com/kubernetes-sigs/prometheus-adapter
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.19/scalers/prometheus/

## Issues Found
- Clarified that CPU/memory utilization-based HPA metrics require resource requests on the relevant containers. Kubernetes documents that CPU utilization is undefined if a pod container lacks the relevant resource request.
- Removed the unsupported fixed claim that an Istio sidecar typically uses 50-100m CPU at idle. Actual sidecar usage varies by workload and mesh configuration.
- Added the official Prometheus Community Helm repository setup before the `helm install prometheus-adapter` command so the command sequence works on a fresh Helm client.
- Added `destination_service_name!=""` to the Prometheus Adapter latency `seriesQuery` because the rule maps that label to the Kubernetes Service resource.
- Clarified that the Object metric HPA example targets total service request rate, not per-pod request rate.
- Corrected the startup probe guidance. A startup probe delays liveness/readiness probes for the same container; readiness controls whether the application container is ready, and Istio injects sidecar readiness separately.
- Corrected the PodDisruptionBudget explanation. PDBs protect voluntary evictions such as node drains, but they do not prevent ordinary Deployment/HPA scale-down pod deletion.

## Review Notes
- The YAML examples use current stable APIs where applicable: `autoscaling/v2`, `apps/v1`, `policy/v1`, and `networking.istio.io/v1`.
- `kubectl` and `helm` were not installed in the local environment, so CLI validation was performed against official documentation rather than local `--help` output.
