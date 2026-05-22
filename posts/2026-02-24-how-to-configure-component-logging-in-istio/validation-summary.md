# Validation Summary: How to Configure Component Logging in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istiod
- Envoy sidecars
- Istio gateways
- Kubernetes
- IstioOperator
- Istio Telemetry API
- Envoy access logs

## Sources Consulted
- Istio Component Logging documentation: https://istio.io/latest/docs/ops/diagnostic-tools/component-logging/
- Istio Istiod Introspection / ControlZ documentation: https://istio.io/latest/docs/ops/diagnostic-tools/controlz/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-discovery command reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Envoy Access Logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio installation customization documentation: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio discovery chart values and sidecar injection template: https://github.com/istio/istio/tree/master/manifests/charts/istio-control/istio-discovery
- Envoy access log usage and response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html

## Issues Found
- The Istiod install-time logging examples used `PILOT_LOG_LEVEL`, which is not the current documented install value. Changed the IstioOperator and `istioctl install` examples to use `values.global.logging.level`, which the current Istio discovery chart maps to `--log_output_level`.
- The Istiod log-level list omitted `fatal`, which is accepted by `pilot-discovery` for `--log_output_level`. Added `fatal`.
- The ControlZ runtime example used `kubectl exec` with `curl` inside the `istiod` container. Replaced it with `kubectl port-forward` plus local `curl`, which matches the documented ControlZ access pattern and does not depend on tools being present in the control-plane image.
- The pod creation example used `proxy.istio.io/config` with `proxyStatsMatcher`, which configures statistics matching rather than Envoy log level. Replaced it with the documented `sidecar.istio.io/logLevel` and `sidecar.istio.io/componentLogLevel` annotations.
- The global Envoy log-level example used `meshConfig.defaultConfig.proxyMetadata.ISTIO_META_LOG_LEVEL`, which is not the documented proxy log-level setting. Replaced it with install values `values.global.proxy.logLevel` and `values.global.proxy.componentLogLevel`, which the injection template maps to `--proxyLogLevel` and `--proxyComponentLogLevel`.
- The request ID claim said Istio adds `x-request-id` to all requests. Narrowed it to Envoy-generated request IDs for HTTP requests that do not already have one.

## Review Notes
The access logging examples using `meshConfig.accessLogFile`, `meshConfig.accessLogFormat`, `meshConfig.accessLogEncoding`, and `telemetry.istio.io/v1` are current. The `istioctl admin log` and `istioctl proxy-config log` command syntax is current. The exact set of Istiod scopes and Envoy loggers can vary by Istio and Envoy version, so operators should list current values with `istioctl admin log` and `istioctl proxy-config log <pod-name[.namespace]>` before targeting a specific logger.
