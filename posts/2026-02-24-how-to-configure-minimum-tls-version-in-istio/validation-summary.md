# Validation Summary: How to Configure Minimum TLS Version in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- TLS and mTLS
- Kubernetes Gateway and DestinationRule resources
- EnvoyFilter
- OpenSSL
- Prometheus metrics

## Sources Consulted
- Istio official task: Workload Minimum TLS Version Configuration: https://istio.io/latest/docs/tasks/security/tls-configuration/workload-min-tls-version/
- Istio official reference: MeshConfig `meshMTLS`, `tlsDefaults`, and `TLSConfig`: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio official reference: Gateway `TLSOptions`: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio official reference: DestinationRule `ClientTLSSettings`: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio official operations docs: Envoy Statistics and `proxyStatsMatcher`: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy official reference: TLS parameters and protocol enum values: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/common.proto.html
- Envoy official reference: Listener TLS statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy official version history: TLS Prometheus stat tag extraction in v1.27.0: https://www.envoyproxy.io/docs/envoy/latest/version_history/v1.27/v1.27.0.html

## Issues Found
- The post described Istio as supporting minimum TLS configuration "per-destination" and implied DestinationRule could specify an outbound TLS protocol version. Istio DestinationRule TLS settings support fields such as `mode` and `sni`, but not `minProtocolVersion`; I changed the wording and added the official `meshConfig.tlsDefaults.minProtocolVersion` approach for non-`ISTIO_MUTUAL` outbound TLS defaults.
- The post said Envoy's default minimum TLS version depends on Envoy version and "typically" allows TLS 1.2 and above. Current Envoy documentation states the default minimum is `TLSv1_2`; I updated that statement.
- The Prometheus examples used `TLSv1.2` and `TLSv1.3` label values. Envoy's TLS protocol enum and current Prometheus tag extraction use `TLSv1_2` and `TLSv1_3`; I corrected the label values.
- The monitoring section assumed TLS version stats would always be present. Istio defaults to a minimal Envoy stats set, so I added a note that `ssl.versions.*` stats may need to be enabled with `proxyStatsMatcher`.

## Review Notes
The remaining Istio `Gateway` examples, `meshMTLS.minProtocolVersion` example, `istioctl install` usage, `istioctl proxy-config listener` inspection command, `pilot-agent request GET stats` command, EnvoyFilter TLS protocol enum values, and OpenSSL verification commands are consistent with the official documentation reviewed.
