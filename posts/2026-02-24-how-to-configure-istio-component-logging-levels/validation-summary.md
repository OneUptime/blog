# Validation Summary: How to Configure Istio Component Logging Levels

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istiod
- Envoy sidecar proxies
- pilot-agent
- Kubernetes
- istioctl

## Sources Consulted
- Istio Component Logging documentation: https://istio.io/latest/docs/ops/diagnostic-tools/component-logging/
- Istio Istiod Introspection / ControlZ documentation: https://istio.io/latest/docs/ops/diagnostic-tools/controlz/
- Istio istioctl command reference for `admin log` and `proxy-config log`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Resource Annotations reference for `sidecar.istio.io/logLevel`, `sidecar.istio.io/componentLogLevel`, and `sidecar.istio.io/agentLogLevel`: https://istio.io/latest/docs/reference/config/annotations/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio sidecar injection template source showing how global logging values and annotations map to `--log_output_level`, `--proxyLogLevel`, and `--proxyComponentLogLevel`: https://go-mod-viewer.appspot.com/istio.io/istio%40v0.0.0-20240520182934-d79c90f27776/manifests/charts/istio-control/istio-discovery/files/injection-template.yaml

## Issues Found
- The post listed `trace` as an Istio control plane component logging level. Current Istio control plane logging levels are `none`, `error`, `warn`, `info`, and `debug`; Envoy proxy loggers separately support levels such as `trace`, `warning`, `critical`, and `off`. I split the explanation to distinguish Istio control plane scopes from Envoy proxy logger levels.
- The Istiod install-time example used a `PILOT_LOG_LEVEL` environment variable. Istio's documented component logging mechanism is `--log_output_level`, and the current installation templates derive that from `values.global.logging.level`. I changed the example to use `spec.values.global.logging.level`.
- The Istiod runtime commands used `localhost:8080` for ControlZ. Istiod's ControlZ default port is `9876`, and the current `istioctl admin log` command is the documented way to view and update Istiod logging. I replaced the update/check commands with `istioctl admin log` and corrected the ControlZ port for listing scopes.
- The Envoy startup example claimed MeshConfig settings `proxyStatsMatcher` and `accessLogFile` configure Envoy component log levels. Those fields configure stats matching and access logging, not proxy logger levels. I replaced the snippet with the IstioOperator `values.global.proxy.logLevel` and `values.global.proxy.componentLogLevel` settings used by sidecar injection.
- The pilot-agent section used a `networking.istio.io/v1` `ProxyConfig` with `PILOT_LOG_LEVEL`. Current `ProxyConfig` uses `networking.istio.io/v1beta1`, and its `environmentVariables` field is not the documented way to set pilot-agent log output. I replaced the example with the `sidecar.istio.io/agentLogLevel` annotation and the global `values.global.logging.level` setting.
- The reset command said to reset Envoy back to `info`. Current `istioctl proxy-config log` documents the default reset level as `warning`, so I changed the command and surrounding text to `warning`.
- The global MeshConfig section showed a ConfigMap that configured access logging rather than component logging. I changed the section to describe global startup log level settings through IstioOperator values and clarified that existing proxies need restarts to pick up startup setting changes.

## Review Notes
The remaining runtime logging commands, pod annotations, and Kubernetes log inspection commands are consistent with current Istio documentation. The exact list of Envoy logger names can vary with the Envoy/Istio version, so operators should list active loggers with `istioctl proxy-config log <pod-name>` before setting narrowly scoped logger levels.
