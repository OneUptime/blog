# Validation Summary: How to Set Up API Key Validation with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy external authorization
- EnvoyFilter and Lua HTTP filters
- Istio AuthorizationPolicy and RequestAuthentication
- Istio Telemetry access logging

## Sources Consulted
- Istio External Authorization task: https://istio.io/latest/docs/tasks/security/authorization/authz-custom/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio Authorization Policy Conditions reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Envoy Access Logs task: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry reference: https://istio.io/latest/docs/reference/config/telemetry/
- Envoy Lua HTTP filter reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto.html

## Issues Found
- The Lua EnvoyFilter used `inline_code`, which Envoy marks as deprecated. Changed it to `defaultSourceCode.inlineString`, matching current Envoy/Istio examples.
- The simple header-matching section implied a separate DENY rule was needed to reject missing API keys. Istio treats missing attributes as matches for DENY policies, so the first DENY rule already rejects missing `x-api-key` headers. Clarified this and kept the separate presence-match example as an optional explicit policy.
- The monitoring section suggested grepping default Envoy access logs for `x-api-key` and described the Telemetry snippet as capturing that header. Default Istio access logs do not include arbitrary request headers, and logging full API keys is unsafe. Updated the command and text to describe default access logging accurately and warn against logging full keys.

## Review Notes
- The external authorization examples are structurally consistent with Istio's `CUSTOM` AuthorizationPolicy and mesh `extensionProviders` model, but a real service must implement Envoy's ext_authz check API.
- The ingress gateway selector label `istio: ingressgateway` is common but installation-dependent; users may need to adjust it to match their gateway workload labels.
