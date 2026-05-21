# Validation Summary: How to Configure Sidecar Proxy Logging Levels

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio
- Envoy sidecar proxies
- istioctl
- Kubernetes Deployment annotations
- IstioOperator configuration
- Istio Telemetry API
- Envoy access logs
- CEL access log filters

## Sources Consulted
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Envoy access logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio configure access logs with Telemetry API task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio MeshConfig / global mesh options reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Envoy run/debugging documentation for log levels: https://www.envoyproxy.io/docs/envoy/latest/start/quick-start/run-envoy
- Envoy attributes reference for CEL request/response attributes: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/advanced/attributes
- Envoy access log command operators and response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- The Envoy log level list described `info` simply as the default, which is true for Envoy but misleading for Istio sidecars because `istioctl proxy-config log -r` resets loggers to Istio's default `warning`. Clarified the distinction.
- The runtime reset examples used `--level warning`. Replaced them with `-r`, which is the documented `istioctl proxy-config log` reset flag and preserves the intended default behavior.
- The Telemetry examples used `telemetry.istio.io/v1alpha1`. Updated them to `telemetry.istio.io/v1`, the current stable API version in Istio.
- The access log filter examples used `response.code >= ...` directly. Updated the error filters to handle missing `response.code` for connection failures, following Istio's documented guidance.
- The slow-request CEL example used `response.duration`, which is not a documented Envoy attribute. Changed it to `request.duration > duration('1s')`, using Envoy's documented `request.duration` duration attribute.

## Review Notes
The remaining Kubernetes, IstioOperator, sidecar annotation, access log format, `kubectl logs`, and response flag examples are consistent with current Istio and Envoy documentation. I could not verify `istioctl --help` locally because `istioctl` is not installed in this workspace, so CLI verification used the official Istio command reference.
