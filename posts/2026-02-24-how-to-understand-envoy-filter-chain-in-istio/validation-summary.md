# Validation Summary: How to Understand Envoy Filter Chain in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Envoy listener filters
- Envoy network filters
- Envoy HTTP filters
- Istio EnvoyFilter resources
- istioctl
- Kubernetes kubectl logs

## Sources Consulted
- Envoy listeners architecture: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/listeners/listeners
- Envoy FilterChainMatch API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/listener_components.proto.html
- Envoy TLS Inspector documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/tls_inspector
- Envoy HTTP Inspector documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/http_inspector
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The listener filter description said listener filters run before any data is read. Envoy listener filters can inspect initial connection bytes, so this was changed to say they run before filter-chain selection.
- The TLS inspector ordering explanation implied TLS termination is needed before HTTP protocol detection. TLS inspector detects TLS, SNI, and ALPN from ClientHello; HTTP inspector detects plaintext HTTP. The explanation was corrected accordingly.
- The filter-chain selection section said Envoy evaluates matches in order. Envoy selects the most specific matching chain using documented criteria such as destination port, destination IP, SNI, transport protocol, and application protocols. The text was corrected.
- The HTTP filter list claimed a fixed Istio order and placed RBAC before JWT authentication. The text was adjusted to avoid a fixed-order overclaim and to describe authentication before authorization.
- The EnvoyFilter Lua example used `typedConfig`, which is the JSON/protobuf camelCase form, inside YAML Envoy config. It was changed to `typed_config`, which matches Envoy and Istio examples.

## Review Notes
The `istioctl proxy-config listener`, `route`, and `log --level` command forms are current in the Istio command reference. Exact filter names and ordering can vary by Istio version, enabled policies, and workload configuration, so future updates should avoid presenting a single dumped filter chain as universal.
