# Validation Summary: How to Configure Lua Filters in Istio Envoy Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy HTTP Lua filter
- Lua
- Kubernetes kubectl
- istioctl

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua filter v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio proxy-config diagnostic tools: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio istioctl analyze documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-analyze/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The Lua filter examples used the deprecated `inline_code` field. Updated them to Istio's current `defaultSourceCode.inlineString` form, matching the official Istio EnvoyFilter examples and Envoy's recommendation to use `default_source_code` instead of `inline_code`.
- The post said Lua filters are not a good fit for external HTTP calls because Envoy has limited async support. Envoy's Lua API supports `httpCall()` with synchronous-style coroutine execution and an asynchronous option, so this was changed to warn against arbitrary network I/O beyond Envoy's API.
- The post said Lua filters cannot share state across requests. Envoy Lua has per-worker Lua environments, but not truly global shared state across all workers, so this was corrected to refer to consistent shared state across worker threads or requests.
- The request ID example tried to read `x-request-id` from response headers in `envoy_on_response`, which would only work if the upstream response echoed that header. Updated the example to store the request ID in dynamic metadata during request processing and read it back during response processing.
- The performance section said Lua filters run in the main Envoy thread. Envoy Lua environments are per worker thread, so this was corrected to say the filter runs on the worker thread handling the stream.
- The latency claim said header manipulation is well under 1 millisecond per request. This was too absolute without an official guarantee, so it was changed to recommend measuring in the target environment.

## Review Notes
EnvoyFilter is a powerful and implementation-sensitive Istio API. The examples are valid for current Istio-style EnvoyFilter snippets, but production users should still test with `istioctl analyze` and inspect generated proxy configuration because filter ordering and matching depend on the deployed Istio version and workload topology.
