# Validation Summary: How to Configure Istio Fault Injection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy
- VirtualService traffic management
- Fault injection
- Request timeouts and retries
- Kiali and proxy observability

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Fault Injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio Traffic Management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio Traffic Management Problems: https://istio.io/latest/docs/ops/common-problems/network-issues/
- Istio Envoy Statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy HTTP fault injection filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/fault_filter
- Envoy access logging documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage

## Issues Found
- Updated all Istio `VirtualService` examples from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API used in the latest Istio documentation.
- Corrected the timeout testing example so the fault is injected on an upstream service called by `reviews`, instead of showing timeout and fault policies for the same client-side destination. Istio documents that timeouts are not enabled on a client-side route where faults are enabled.
- Reworked the retry testing section to warn that `fault` and `retries` should not be placed on the same `VirtualService` route when expecting retries to handle the injected fault. Istio documents this as unsupported behavior.
- Corrected the combined delay/abort explanation so it no longer implies a simple "remaining percentage" after independent fault percentages.
- Replaced the proxy metric example with Envoy fault-filter metrics such as `http.<stat_prefix>.fault.delays_injected` and `http.<stat_prefix>.fault.aborts_injected`.
- Corrected the access log command to look for `DI` and `FI` response flags in default Envoy/Istio access logs, instead of grepping for a literal `response_flags` key that is only present in some structured custom log formats.
- Added `percentage` to the "missing route" examples so the delay example actually represents an enabled delay fault.

## Review Notes
All YAML snippets were parsed successfully after edits. `kubectl` is not installed in this workspace, so Kubernetes command behavior was verified against official documentation rather than local CLI help.
