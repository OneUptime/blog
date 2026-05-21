# Validation Summary: How to Enable Debug Logging for Pilot-Agent

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio sidecar injection
- Istio pilot-agent / istio-agent logging
- IstioOperator and Helm values
- Kubernetes Deployments
- kubectl logs, get, exec, apply, and rollout restart
- Envoy bootstrap configuration

## Sources Consulted
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio pilot-agent command reference: https://istio.io/latest/es/docs/reference/commands/pilot-agent/
- Istio Component Logging documentation: https://istio.io/latest/docs/ops/diagnostic-tools/component-logging/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio MeshConfig ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio istioctl proxy-config bootstrap reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio sidecar injection template source: https://github.com/istio/istio/blob/master/manifests/charts/istio-control/istio-discovery/files/injection-template.yaml
- Istio pilot-agent status server and request command source: https://github.com/istio/istio/tree/master/pilot/cmd/pilot-agent
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post used `proxy.istio.io/config` with `proxyMetadata.OUTPUT_LOG_LEVEL` to set pilot-agent debug logging. Istio's injection template uses `sidecar.istio.io/agentLogLevel` to populate pilot-agent's `--log_output_level`, so the example was changed to that annotation.
- The post recommended using a `ProxyConfig` resource with `environmentVariables.ISTIO_LOG_LEVEL` for pilot-agent logging. `ProxyConfig.environmentVariables` adds proxy environment variables and is not the documented mechanism for pilot-agent log output levels, so that section was changed to show scoped `sidecar.istio.io/agentLogLevel` usage.
- The global examples used `meshConfig.defaultConfig.proxyMetadata.ISTIO_LOG_LEVEL`. Istio's Helm charts and injection templates use `global.logging.level` for `--log_output_level`, so the IstioOperator and Helm snippets were corrected to `values.global.logging.level` and `global.logging.level`.
- The runtime examples used `localhost:15004/logging` to change pilot-agent log levels. Istio sidecar pilot-agent does not expose that runtime logging endpoint on port 15004; 15004 is an allowed pilot-agent request/debug port for XDS debug access. The section was corrected to explain that pilot-agent log levels are startup arguments and require a pod restart.
- The targeted scope examples used runtime `curl` commands against port 15004. These were changed to scoped `sidecar.istio.io/agentLogLevel` annotations such as `ca:debug,sds:debug` and `dns:debug`.
- The Deployment snippets were missing required `spec.selector` and matching pod template labels for `apps/v1` Deployments. Added `selector.matchLabels` and `template.metadata.labels`.

## Review Notes
The bootstrap inspection path `/etc/istio/proxy/envoy-rev.json` is consistent with Istio's default proxy config path and generated `envoy-rev.<suffix>` file naming. The post still uses simple `grep` patterns for separating pilot-agent and Envoy logs; those are reasonable heuristics, but exact log formatting can vary by Istio/Envoy version and JSON logging settings.
