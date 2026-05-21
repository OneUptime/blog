# Validation Summary: How to Set Proxy Memory Limits in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection and proxy resource annotations
- IstioOperator and Helm installation values
- Kubernetes memory requests, limits, OOMKilled state, and kubectl commands
- Prometheus and PromQL
- Istio Sidecar resources
- Envoy access logging in Istio
- Kubernetes Vertical Pod Autoscaler
- Fortio load testing

## Sources Consulted
- Istio resource annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio sidecar injection resource annotation guidance: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Kubernetes resource management for pods and containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The Prometheus query labelled "Average memory by deployment" grouped by `pod`, not by a deployment label. Changed the label to "Average memory by pod" so the description matches the query.
- The VPA section recommended switching to `updateMode: "Auto"` for automatic updates. Current Kubernetes VPA documentation marks `Auto` as deprecated. Changed the recommendation to `updateMode: "Recreate"` and noted that `Auto` is deprecated.

## Review Notes
- The Istio proxy memory annotations are still documented, but they are alpha annotations. Future versions may change their behavior.
- The memory sizing values are reasonable starting examples, not official guarantees. Operators should still measure sidecar memory usage in their own mesh before setting limits.
