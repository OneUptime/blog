# Validation Summary: How to Set Up Mutual Exclusion for Service Versions in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio EnvoyFilter
- Envoy Lua HTTP filter
- Kubernetes Deployments
- Flask and Python requests
- curl

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- curl manual: https://curl.se/docs/manpage.html
- Flask API documentation: https://flask.palletsprojects.com/en/stable/api/
- Requests API documentation: https://requests.readthedocs.io/en/latest/api/

## Issues Found
- The Envoy Lua examples used the deprecated `inline_code` field. Updated both examples to use `defaultSourceCode.inlineString`, which maps to the current Envoy v3 Lua `default_source_code.inline_string` configuration field in Istio EnvoyFilter YAML.
- The cookie-based Lua example tried to read `x-assign-version` from response headers after adding it to request headers. Request headers are not response headers, so the response hook would not reliably set the cookie. Updated the example to store the assigned version in Envoy stream dynamic metadata during `envoy_on_request` and read it during `envoy_on_response`.
- Several Istio VirtualService and DestinationRule examples used `networking.istio.io/v1beta1`. Updated them to `networking.istio.io/v1`, matching current Istio reference examples.
- The consistent hash section implied that consistent hashing could guarantee version-level mutual exclusion across v1 and v2 subsets. Corrected the text to explain that consistent hashing provides soft pod-level affinity within the selected destination, and that header or cookie routing should select the version subset first.
- The testing section implied that `x-served-by` would always be present. Clarified that this check only works if the application adds that response header.

## Review Notes
The EnvoyFilter examples remain low-level and can be sensitive to Istio and Envoy filter-chain changes. For production use, these snippets should be tested with the exact Istio version and ingress gateway deployment in use.
