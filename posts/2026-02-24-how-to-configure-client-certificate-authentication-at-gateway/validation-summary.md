# Validation Summary: How to Configure Client Certificate Authentication at Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio Gateway
- Istio VirtualService
- Istio EnvoyFilter
- Kubernetes Secrets
- OpenSSL
- curl
- Mutual TLS (mTLS)
- X.509 client certificates

## Sources Consulted
- Istio Secure Gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway API reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio AuthorizationPolicy condition reference: https://istio.io/latest/docs/reference/config/security/conditions/
- Envoy HTTP connection manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- OpenSSL command behavior verified locally with the certificate generation commands from the post.

## Issues Found
- The post used `networking.istio.io/v1beta1` for Gateway and VirtualService examples. Istio's current documentation uses `networking.istio.io/v1`, so the snippets were updated to the current stable API version.
- The client certificate example did not include a Subject Alternative Name, but the later authorization example needs a SAN to match a specific client identity. The client certificate signing command now adds a URI SAN.
- The AuthorizationPolicy example used `connection.uri_san_peer_certificate`, which is not a supported Istio AuthorizationPolicy condition key. It also implied that a backend AuthorizationPolicy can directly match the external client certificate identity after TLS termination at the gateway. That example was replaced with the supported Gateway `subjectAltNames` TLS setting for client certificate SAN validation.

## Review Notes
- The combined Kubernetes secret format using `tls.key`, `tls.crt`, and `ca.crt` matches Istio's documented mutual TLS ingress gateway secret format.
- The EnvoyFilter XFCC settings use Envoy's documented `SANITIZE_SET` mode and `set_current_client_cert_details` fields. Backend services should treat XFCC as trusted only when it is set by the gateway and client-supplied values are sanitized.
