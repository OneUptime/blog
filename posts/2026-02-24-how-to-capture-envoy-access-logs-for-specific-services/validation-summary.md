# Validation Summary: How to Capture Envoy Access Logs for Specific Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Envoy access logs
- Kubernetes workloads and `kubectl logs`
- IstioOperator mesh configuration
- CEL access log filters

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio access log task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API access log task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio mesh configuration reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Envoy access log command operators: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage
- Envoy attributes reference: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes

## Issues Found
- The post said the Telemetry API was recommended starting with Istio 1.12+. Istio 1.12 release notes describe Telemetry API access logging support as alpha, while current Istio documentation recommends Telemetry API for access logging and `telemetry.istio.io/v1` was promoted in Istio 1.22. Updated the wording to avoid implying the current `v1` recommendation applied unchanged in Istio 1.12.
- The slow-request filter examples used `duration > duration('1s')`, but Envoy's documented request duration attribute is `request.duration`. Updated the slow-request and combined-condition examples to use `request.duration`.
- The annotation section implied `proxy.istio.io/config` could be used for per-pod access log control, but the example configures `proxyStatsMatcher`, which controls Envoy stats matching rather than access logging. Reworded the section to clarify that the annotation is not the access logging control path and that Telemetry API should be used.
- The JSON parsing command piped all Kubernetes log lines into `python3 -m json.tool`, which fails for newline-delimited JSON logs with more than one entry. Updated the command to parse a single log line with `head -n 1`.

## Review Notes
- Istio's current Telemetry API reference documents `accessLogging.filter`, and the CRD schema allows it with `apiVersion: telemetry.istio.io/v1`; however, Istio's v1 API announcement notes that `accessLogging.filter` was not promoted as a stable v1 field. Users in strict stable-validation environments may need to account for that caveat.
