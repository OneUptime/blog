# Validation Summary: How to Add Custom Listeners with EnvoyFilter

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- EnvoyFilter
- Envoy listeners and listener filters
- Envoy HTTP connection manager
- Envoy TCP proxy
- Envoy downstream TLS
- Kubernetes pod annotations
- istioctl and kubectl

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio application requirements and reserved sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Envoy listener v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/listener.proto.html
- Envoy TCP proxy v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/tcp_proxy/v3/tcp_proxy.proto.html
- Envoy TLS transport socket v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/tls.proto.html
- Envoy HTTP route components v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html

## Issues Found
- The custom health check listener used port `15021`, which is reserved by Istio for health checks. Changed the example to use port `18021` and adjusted the explanation to recommend Istio's built-in health check port for basic proxy health.
- The listener filter example patched the whole listener with `applyTo: LISTENER` and `MERGE`, which can duplicate or overwrite listener filter behavior. Changed it to use `applyTo: LISTENER_FILTER` with `INSERT_BEFORE` to insert `envoy.filters.listener.proxy_protocol` before `envoy.filters.listener.tls_inspector`, matching Istio's documented EnvoyFilter pattern.
- The inbound capture annotation example did not include the corrected health-check port or the other custom listener ports used in the article. Updated the sample value to include `18021`, `9999`, `8443`, and `8081`.

## Review Notes
The examples rely on EnvoyFilter, which Istio documents as an advanced API tied to Envoy xDS internals. The post correctly warns that EnvoyFilter usage should be minimized and verified during Istio upgrades. In a real deployment, the referenced inbound clusters such as `inbound|9999||` and `inbound|8080||` must exist in the generated proxy configuration, typically because the workload and Service expose those ports.
