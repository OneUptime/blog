# Validation Summary: How to Configure API Gateway mTLS for Service-to-Service Authentication

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Mutual TLS (mTLS)
- OpenSSL
- Kubernetes Secrets and Deployments
- NGINX
- Envoy Proxy
- Istio PeerAuthentication, DestinationRule, and AuthorizationPolicy
- Kong Gateway mtls-auth plugin
- Python Requests
- Go crypto/tls and crypto/x509
- cert-manager
- Prometheus / Prometheus Operator alert rules

## Sources Consulted
- OpenSSL req documentation: https://docs.openssl.org/3.1/man1/openssl-req/
- OpenSSL x509 documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL x509v3_config documentation: https://docs.openssl.org/3.1/man5/x509v3_config/
- Kubernetes kubectl create secret tls documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes Secret TLS type documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- NGINX SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- NGINX Docker image documentation: https://hub.docker.com/_/nginx
- Envoy DownstreamTlsContext API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/tls.proto
- Envoy listener TLS statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Istio PeerAuthentication documentation: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio DestinationRule documentation: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio AuthorizationPolicy documentation: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Kong Gateway mtls-auth plugin documentation: https://developer.konghq.com/plugins/mtls-auth/
- Python Requests SSL certificate verification documentation: https://docs.python-requests.org/en/master/user/advanced/#ssl-cert-verification
- Go crypto/tls package documentation: https://pkg.go.dev/crypto/tls
- Go os.ReadFile documentation: https://pkg.go.dev/os#ReadFile
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- Prometheus query operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The OpenSSL certificate commands created server and client certificates without SAN and key-usage extensions. Added SAN, keyUsage, extendedKeyUsage, CA basic constraints, and `-copy_extensions copy` so generated certificates validate correctly with modern TLS clients.
- The NGINX config referenced `gateway-cert.pem`, `gateway-key.pem`, and `/etc/nginx/certs/ca-cert.pem`, but Kubernetes TLS secrets mount as `tls.crt` and `tls.key`, and the CA secret was mounted at `/etc/nginx/ca`. Updated the paths.
- The NGINX snippet used `$ssl_client_cert`, which NGINX documents as deprecated. Replaced it with `$ssl_client_escaped_cert`.
- The NGINX full `nginx.conf` snippet omitted an `events {}` block. Added it so the file is a valid standalone NGINX configuration.
- The deployment pinned `nginx:1.25`, which is outdated. Changed it to `nginx:stable`.
- The Istio authorization explanation described extracting CN/O attributes, but the example matches authenticated SPIFFE service-account principals. Updated the explanation to match the configuration.
- The Kong Admin API commands enabled the plugin before creating the CA certificate. Reordered the commands so the CA is uploaded first.
- The Kong declarative example used `skip_consumer_lookup: false` without a consumer mapping. Added a consumer with `mtls_auth_credentials` for the client certificate subject.
- The Go client used deprecated `ioutil.ReadFile`. Replaced it with `os.ReadFile`.
- The Envoy alert used `envoy_listener_ssl_connection_error`, which excludes failed certificate verification. Replaced it with an alert over Envoy TLS verification failure counters.

## Review Notes
- YAML and Python snippets were parsed locally.
- The corrected OpenSSL flow was executed locally and produced a gateway certificate whose SAN matches `api-gateway.internal`.
- Go was not installed in the local environment, so the Go snippet was reviewed against official Go documentation but not compiled locally.
