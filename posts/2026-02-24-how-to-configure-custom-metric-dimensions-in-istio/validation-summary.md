# Validation Summary: How to Configure Custom Metric Dimensions in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Telemetry API
- Istio standard metrics
- Envoy attributes and CEL expressions
- Istio WasmPlugin AttributeGen
- Prometheus and PromQL
- Kubernetes kubectl

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Customizing Istio Metrics with Telemetry API task: https://istio.io/latest/docs/tasks/observability/metrics/telemetry-api/
- Istio Customizing Istio Metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio Classifying Metrics Based on Request or Response task: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Envoy attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes.html
- Kubernetes CEL reference for map key checks: https://kubernetes.io/docs/reference/using-api/cel/

## Issues Found
- The Telemetry examples used Mixer's old pipe default operator, such as `request.headers['x-api-version'] | 'unknown'`. Current Istio Telemetry tag values are CEL expressions, and Istio documentation states that the pipe operator is not supported. I changed these examples to use CEL map key checks with the `in` operator and ternary defaults.
- The post described `connection_security_policy` as "mTLS or none". Istio documents this label as `mutual_tls` for destination reports with secured communication and `unknown` when the policy cannot be populated. I updated the wording to "mutual TLS or unknown".
- The post recommended an EnvoyFilter stats configuration for advanced dimensions. Current Istio documentation recommends Telemetry API for metrics customization and notes that Telemetry API cannot work together with the old Prometheus EnvoyFilter path. I replaced that section with the documented AttributeGen WasmPlugin plus Telemetry pattern.
- The description referenced EnvoyFilter as part of the implementation path. I updated it to reference AttributeGen instead.

## Review Notes
The remaining Telemetry API structure, metric enum names, standard Prometheus metric names, PromQL examples, and `kubectl exec` usage are consistent with the official documentation reviewed. The metrics endpoint example uses `localhost:15020/stats/prometheus`, which is valid for Istio's merged metrics endpoint; Istio task docs also commonly show `localhost:15000/stats/prometheus` for Envoy admin metrics.
