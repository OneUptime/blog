# Validation Summary: How to Set Up Custom Error Pages with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy Lua HTTP filter
- Kubernetes ConfigMap, Deployment, and Service
- NGINX static file serving
- Istio VirtualService fault injection
- kubectl

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The first approach was titled "Custom Error Service with VirtualService" even though no VirtualService can route already-generated error responses to a separate service in the way described. Changed the heading and explanation to say the service is fetched by the gateway error-handling filter.
- The NGINX sample marked `/404.html`, `/502.html`, and `/503.html` as `internal`, but the later Envoy Lua `httpCall` fetches those paths directly. Removed `internal` so direct internal HTTP requests from Envoy can receive `200` responses.
- The external error-service Lua example handled `504` responses but the NGINX ConfigMap did not include a `504.html` page. Added a `504.html` entry, NGINX location, and volume mount.
- The Envoy Lua filter snippets used `inline_code`, which Envoy marks as deprecated in favor of `default_source_code`. Updated the Istio EnvoyFilter examples to use `defaultSourceCode.inlineString`, matching Istio's EnvoyFilter examples.
- The Lua snippets used `response_handle:body():setBytes(...)`, which can fail when the original response has no body. Updated them to use `response_handle:body(true):setBytes(...)` so a body object is always returned.
- The Lua snippets replaced response bodies without clearing `content-length`, which can leave a stale length after body replacement. Added `response_handle:headers():remove("content-length")` before setting replacement bodies.

## Review Notes
The corrected examples are syntactically valid YAML. EnvoyFilter remains a low-level Istio escape hatch, so users should test against their installed Istio/Envoy version and inspect generated clusters if the service-backed `httpCall` cluster name differs in their environment.
