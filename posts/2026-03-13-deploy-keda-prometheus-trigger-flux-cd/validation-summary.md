# Validation Summary: How to Deploy KEDA with Prometheus Trigger with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- KEDA ScaledObject and TriggerAuthentication
- KEDA Prometheus scaler
- Prometheus / PromQL
- Flux CD v2 Kustomization
- Kustomize
- kubectl

## Sources Consulted
- KEDA Prometheus scaler documentation: https://keda.sh/docs/2.19/scalers/prometheus/
- KEDA ScaledObject specification: https://keda.sh/docs/2.19/reference/scaledobject-spec/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The Prometheus connectivity test executed `wget` inside the `keda-operator` container. That depends on the operator image containing `wget`, which is not required for KEDA to work. Changed the command to run a short-lived `curlimages/curl` pod in the `keda` namespace and pipe its response to local `python3 -m json.tool`.
- The HTTP request-rate query divided the total request rate by pod count while relying on KEDA's default `AverageValue` metric type. This double-normalizes the scaling signal. Changed the example to query total request rate and clarified that the threshold is treated as a per-replica target.
- The secured Prometheus example referenced a `TriggerAuthentication` but did not show the required Prometheus scaler `authModes: "bearer"` metadata. Added `authModes: "bearer"` to the trigger reference snippet.
- The Kustomize resource list omitted `trigger-auth-prometheus.yaml`, so the Secret and TriggerAuthentication would not be applied if the secured Prometheus step were used. Added the file to the Kustomization resources.
- The best-practice note recommended per-replica PromQL normalization for request-rate metrics without accounting for KEDA's default `AverageValue` behavior. Updated it to recommend total-rate queries for `AverageValue`, or `metricType: Value` when the query already returns a per-pod average.

## Review Notes
- The KEDA `ScaledObject`, `TriggerAuthentication`, and Flux `Kustomization` API versions and field names used in the post are current according to the consulted documentation.
- PromQL label names such as `service`, `namespace`, and `relname` depend on each deployment's instrumentation and exporters. The examples are plausible, but readers should verify the exact labels in their own Prometheus instance.
