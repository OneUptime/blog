# Validation Summary: How to Configure Request Body Size Limits in Istio

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy HTTP buffer filter
- Envoy Lua HTTP filter
- Envoy HTTP connection manager
- Istio AuthorizationPolicy
- Kubernetes kubectl
- curl

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Envoy buffer filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/buffer_filter
- Envoy buffer filter v3 API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/buffer/v3/buffer.proto
- Envoy Lua filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter.html
- Envoy HTTP connection manager v3 API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Istio rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- curl man page: https://curl.se/docs/manpage.html

## Issues Found
- The Lua EnvoyFilter snippet used `envoy.lua` as the filter name. Updated it to the current canonical Envoy v3 filter name, `envoy.filters.http.lua`.
- The post described the workload-selector examples as per-route limits. Updated the description and heading to per-service limits, and clarified that true route-level overrides use Envoy `BufferPerRoute` on routes or virtual hosts.
- The HTTP connection manager merge snippet omitted the matched network filter name in the patch value. Added `name: envoy.filters.network.http_connection_manager`, matching Istio's EnvoyFilter merge examples.
- The test commands generated files on the local machine but then tried to read them from inside the Kubernetes client pod. Updated the `dd` commands to run inside the pod.
- The test upload commands used `curl -d @file`, which can transform file data. Updated them to use `--data-binary @file` for exact body-size testing.

## Review Notes
EnvoyFilter exposes Envoy internals, so configurations should be rechecked during Istio/Envoy upgrades. The main buffer-filter approach is technically valid, but operators should size proxy memory carefully because accepted requests are buffered before forwarding.
