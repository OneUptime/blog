# Validation Summary: How to Configure EnvoyFilter Resources in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio EnvoyFilter
- Envoy HTTP filters
- Envoy Lua filter
- Envoy compressor filter
- Kubernetes manifests
- istioctl and kubectl commands

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Lua filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy compressor filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/compressor/v3/compressor.proto
- Envoy compressor filter configuration guide: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/compressor_filter

## Issues Found
- The Lua EnvoyFilter examples used the deprecated `inline_code` field. Updated both Lua examples to use `default_source_code.inline_string`, which is the current Envoy v3 Lua API field.
- The `applyTo` list omitted `LISTENER_FILTER` and described `BOOTSTRAP` without noting its deprecation. Added `LISTENER_FILTER` and marked `BOOTSTRAP` as deprecated.
- The bootstrap example introduced bootstrap patching without a deprecation caveat. Added a short note that bootstrap patches are deprecated in EnvoyFilter.
- The guidance to "pin to specific Envoy config versions" was not an Istio EnvoyFilter field-level recommendation. Changed it to recommend `proxyVersion` matches for version-sensitive patches.
- The claim that Envoy silently ignores invalid config patches was too broad. Reworded it to say some patches may have no effect and invalid generated config can be rejected by Envoy.
- The debugging examples used `deploy/my-service`; Istio's command reference documents the deployment resource form as `deployment/<deployment-name>`. Updated the Istio and Kubernetes examples to use `deployment/my-service`.
- The use-case list implied custom response headers generally require EnvoyFilter, but Istio VirtualService supports request and response header manipulation. Narrowed the wording to Envoy-specific header logic not covered by Istio APIs.

## Review Notes
The corrected examples are still advanced EnvoyFilter patches and remain sensitive to Istio and Envoy implementation details. Istio's own reference notes that `FilterClass` with `ADD` is preferred over relative `INSERT_*` operations when possible because relative insertion depends on filter names.
