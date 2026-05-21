# Validation Summary: How to Handle Protocol Mismatch Errors in Istio

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes Services
- DestinationRule TLS settings
- Kyverno validation policies

## Sources Consulted
- Istio protocol selection documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio TLS configuration documentation: https://istio.io/latest/docs/ops/configuration/traffic-management/tls-configuration/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Envoy access log response flags documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy HTTP connection manager statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Envoy upstream cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno ValidatingPolicy examples: https://kyverno.io/policies/other-vpol/require-container-port-names/require-container-port-names/

## Issues Found
- The post said unnamed ports can be misidentified by protocol sniffing. Istio's documented behavior is that it automatically detects HTTP and HTTP/2 when possible and otherwise treats traffic as TCP, so the wording was corrected.
- The post implied Service port-name changes require restarting all client pods. Istio normally pushes updated proxy configuration automatically, so the wording now limits restarts to stale configuration or application caching cases.
- The HTTP/2 section said Envoy transparently handles HTTP/1.1-to-HTTP/2 upgrades for services named `http`. This was too broad; the post now says to use `http2`/`grpc` or explicitly configure HTTP/2 upgrade behavior when the backend requires HTTP/2.
- The DestinationRule examples used `networking.istio.io/v1beta1`. Istio's current reference uses `networking.istio.io/v1`, so the snippets were updated.
- The `istioctl authn tls-check` command is not present in the current Istio command reference. It was replaced with `istioctl proxy-config clusters ... -o json` guidance for inspecting TLS transport socket configuration.
- The Envoy protocol error counter name was imprecise. It now references `upstream_cx_protocol_error` and `downstream_cx_protocol_error`, matching Envoy's documented stats.
- The `appProtocol` example used `kubernetes.io/h2c`, which is a Kubernetes-defined appProtocol value but is not listed in Istio's supported protocol selection values. The example now uses Istio's documented `http2` value.
- The Kyverno example used deprecated `ClusterPolicy` style and a pattern value that would not express an OR over protocol prefixes. It was replaced with a current CEL-based `ValidatingPolicy` using a regex over Service port names.

## Review Notes
The core guidance on Istio protocol selection, Service port naming, `appProtocol`, DestinationRule TLS modes, and Envoy access-log response flags is technically valid. MongoDB, MySQL, and Redis protocol support in Istio is experimental and requires the corresponding Istio environment variables; the post's prefix table is accurate as a naming reference but future revisions could call out that caveat more explicitly.
