# Validation Summary: How to Classify Metrics Based on Request or Response in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio standard metrics
- Envoy CEL attributes
- Prometheus and PromQL
- Kubernetes kubectl
- YAML configuration

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Customizing Istio Metrics with Telemetry API: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio Classifying Metrics Based on Request or Response: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction and problem statement implied that raw Istio metrics include individual URL paths by default. Istio standard metrics include labels such as `response_code`, but not raw URL paths by default. Updated the wording to clarify that high-cardinality URL paths become a problem when raw request attributes are added as metric labels.
- Header-based examples accessed request and response header maps directly before calling string methods. Envoy exposes headers as maps indexed by lower-cased header name, so missing headers should be guarded. Updated the header expressions to check key presence with `in` before reading the map values.
- The content-type example used exact matches, which can miss common values such as `application/json; charset=utf-8`. Updated it to use `startsWith` after checking header presence.
- The catch-all best practice said unmatched requests get an empty string label. Depending on provider and expression evaluation, missing or unmatched values can also be unset. Updated the wording to avoid over-stating a single behavior.

## Review Notes
The post uses direct Telemetry API `tagOverrides` with CEL expressions over Envoy attributes, which is supported by the Istio Telemetry API. Istio's official classification task also documents an AttributeGen WasmPlugin pattern that writes values into `filter_state` and then exposes them through Telemetry; that approach may be preferable for larger or reusable classification rule sets.
