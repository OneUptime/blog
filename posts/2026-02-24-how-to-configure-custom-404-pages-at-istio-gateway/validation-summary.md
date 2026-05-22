# Validation Summary: How to Configure Custom 404 Pages at Istio Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio EnvoyFilter
- Envoy Lua HTTP filter
- Kubernetes ConfigMap, Deployment, and Service
- kubectl
- NGINX
- Prometheus / PromQL

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy Lua HTTP filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- NGINX web server documentation: https://docs.nginx.com/nginx/admin-guide/web-server/web-server/
- NGINX static content documentation: https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/

## Issues Found
- The NGINX error-page service would have returned HTTP 200 for the custom page because `try_files /index.html =404` serves the existing file successfully. Changed the NGINX config to return 404 and use `error_page 404 /index.html` so the custom page is served with the correct status.
- The catch-all VirtualService explanation implied that wildcard hosts catch all unmatched paths for hosts that already have specific VirtualServices. Clarified that this pattern is mainly for unmatched hosts, and that same-host unmatched paths need a final host-specific route or the EnvoyFilter approach.
- The first EnvoyFilter YAML block was invalid because the embedded HTML inside the Lua long string was not indented as part of the YAML literal block. Indented the HTML so the snippet parses as YAML.
- The Lua response-body examples used `body():setBytes(...)`, which can fail when the original 404 has an empty body. Changed them to `body(true):setBytes(...)` based on Envoy's documented `always_wrap_body` argument.
- The per-host Lua example tried to read `:authority` from response headers. Captured the request `:authority` in dynamic metadata during `envoy_on_request` and read it back during `envoy_on_response`.
- The post described `"no healthy upstream"` as a 404 body, but that is not a normal 404 local-reply body. Reworded the claim to refer to Envoy local-reply messages and default 404 response bodies.
- Updated Istio `Gateway` and `VirtualService` examples from `networking.istio.io/v1beta1` to the current `networking.istio.io/v1` API used in the latest Istio documentation.
- The test command only read `.status.loadBalancer.ingress[0].ip`, which misses cloud load balancers that expose a hostname. Changed it to read either IP or hostname.
- The `kubectl port-forward` example would block before the following `curl` in a single shell. Backgrounded the port-forward command.
- The PromQL query used `reporter="destination"` for ingress-gateway 404 monitoring. Istio documents gateway metrics as `reporter="source"`, so the query was updated accordingly.

## Review Notes
EnvoyFilter remains a low-level Istio API that is powerful but sensitive to proxy and Istio upgrades. The examples are technically valid, but production users should test EnvoyFilter changes with their exact Istio/proxy version and prefer ordinary routing configuration when it is sufficient.
