# Validation Summary: How to Configure Custom Error Pages in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Istio VirtualService
- Istio WasmPlugin
- Envoy HTTP Lua filter
- Envoy HTTP connection manager local reply configuration
- Kubernetes Deployment, Service, and ConfigMap
- kubectl and curl

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Istio WasmPlugin reference: https://istio.io/latest/docs/reference/config/proxy_extensions/wasm-plugin/
- Envoy Lua filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy local reply modification documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/local_reply.html
- Envoy HeaderValueOption API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/base.proto
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/

## Issues Found
- The Lua EnvoyFilter used the deprecated `inline_code` field. Changed it to `default_source_code.inline_string`, which is the current Envoy v3 Lua configuration field.
- The local reply and cache-control header examples used the deprecated Envoy `append: false` field. Changed these to `append_action: OVERWRITE_IF_EXISTS_OR_ADD`.
- The local reply EnvoyFilter patch omitted the network filter `name` in the merged value. Added `name: envoy.filters.network.http_connection_manager` to match Istio's documented EnvoyFilter pattern for HTTP connection manager patches.
- The first approach described an external error service as using direct response and VirtualService fault handling, but the snippet only creates a Kubernetes service and ConfigMap. Reworded it as an external error page service that other mechanisms can use.
- The routing fallback section implied Istio retries can be modified to use a fallback cluster for an error service. Istio VirtualService retry policy does not provide that behavior as written. Reworded the section to describe retries/timeouts accurately and noted that returning an error service response requires Lua, Wasm, external processing, or application-level fallback logic.
- Updated the VirtualService example from `networking.istio.io/v1beta1` to the current `networking.istio.io/v1` API version.
- Reworded the Wasm plugin performance claim because the original "best performance" statement was not guaranteed by the official documentation.

## Review Notes
The YAML snippets parse successfully after the changes. `kubectl` is not installed in the local environment, so kubectl command syntax was checked against the official Kubernetes command reference instead of local `--help` output.
