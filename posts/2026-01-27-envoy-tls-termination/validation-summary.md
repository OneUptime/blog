# Validation Summary: How to Configure Envoy TLS Termination

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Envoy Proxy
- TLS termination
- Secret Discovery Service (SDS)
- Mutual TLS (mTLS)
- ALPN
- SNI-based listener routing
- Kubernetes Deployments, Services, Secrets, and ConfigMaps
- OpenSSL troubleshooting commands
- Envoy access logs and TLS statistics

## Sources Consulted
- Envoy TLS overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/security/ssl
- Envoy Certificate Management: https://www.envoyproxy.io/docs/envoy/latest/operations/certificates
- Envoy Secret Discovery Service (SDS): https://www.envoyproxy.io/docs/envoy/latest/configuration/security/secret
- Envoy Common TLS configuration API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/common.proto
- Envoy Downstream TLS context API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/tls.proto
- Envoy ConfigSource and PathConfigSource API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/config_source.proto
- Envoy HTTP connection manager API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Envoy route components API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy access logging documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage
- Envoy TLS statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy release documentation: https://www.envoyproxy.io/docs
- Envoy release process and EOL schedule: https://github.com/envoyproxy/envoy/blob/main/RELEASES.md
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes TLS Secret command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
- The SDS section said static certificates require Envoy restarts for rotation. Updated it to match Envoy's certificate management docs: static `CommonTlsContext` references do not reload automatically and need a restart, hot restart, or listener/cluster reload.
- The remote SDS example described `resource_api_version` as an update interval. Changed the comment because the field selects the xDS resource API version, not polling frequency.
- The file-based SDS example said `watched_directory` watches every 5 seconds. Changed the comment because Envoy's `PathConfigSource` uses filesystem watches and directory-triggered reloads, not a five-second poll interval.
- The revocation section implied Envoy can configure CRL or OCSP checking for revoked client certificates in `validation_context`. Changed the wording because Envoy supports CRL verification there, while OCSP stapling is configured on the presented TLS certificate.
- The Kubernetes Deployment used `envoyproxy/envoy:v1.28-latest`, which is an archived/EOL Envoy line as of 2026-06-12. Updated it to `envoyproxy/envoy:v1.38.2`, the current stable Envoy version listed in official documentation.

## Review Notes
The post remains a broad tutorial with illustrative snippets. Some examples are intentionally partial and require real certificate files, backend clusters, SDS server implementation, and Kubernetes-specific volume content before they can be run directly.
