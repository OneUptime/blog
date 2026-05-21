# Validation Summary: How to Set Up API Request Validation with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Istio AuthorizationPolicy
- Envoy HTTP Lua filter
- Envoy HTTP buffer filter
- Envoy HTTP connection manager
- Kubernetes YAML manifests
- curl and dd command-line testing

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio AuthorizationPolicy conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua filter proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy buffer filter proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/buffer/v3/buffer.proto
- Envoy HTTP connection manager proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto

## Issues Found
- The Lua EnvoyFilter examples used `inlineCode`, which maps to Envoy's deprecated `inline_code` field. Updated the Lua examples to use `defaultSourceCode.inlineString`, matching current Envoy and Istio examples.
- The Content-Type section said it covered POST and PUT requests, but the sample policy also checks PATCH. Updated the explanation to include PATCH.
- The request size section described `max_request_headers_kb` as a body-size limit. Updated the explanation to state that it limits request headers and returns 431 for oversized headers, while keeping the buffer filter example for request body limits.
- The EnvoyFilter ordering section incorrectly said filters are applied alphabetically by name. Updated it to reflect Istio's documented ordering: config root namespace first, then workload namespace, with patch sets sorted by priority, creation time, and fully qualified resource name.

## Review Notes
- EnvoyFilter remains a low-level Istio extension point tied to Envoy xDS details, so these examples should be rechecked during Istio or Envoy proxy upgrades.
- The AuthorizationPolicy examples are valid for HTTP workloads. If a DENY policy using HTTP-only attributes is applied to TCP traffic, Istio documents that missing HTTP attributes can be treated as matches, so production DENY policies should usually be scoped carefully, such as by port.
