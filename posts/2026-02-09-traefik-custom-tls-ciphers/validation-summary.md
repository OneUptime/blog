# Validation Summary: How to Configure Traefik Ingress Controller with Custom TLS Options and Ciphers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Traefik Proxy Kubernetes CRDs
- Traefik Helm chart
- TLSOption and TLSStore
- IngressRoute and IngressRouteTCP
- TLS, cipher suites, ALPN, SNI, and mTLS
- OpenSSL, nmap, testssl.sh, and kubectl

## Sources Consulted
- Traefik TLSOption CRD documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/tcp/tlsoption/
- Traefik TLSStore CRD documentation: https://doc.traefik.io/traefik/master/reference/routing-configuration/kubernetes/crd/tls/tlsstore/
- Traefik IngressRoute documentation: https://doc.traefik.io/traefik/v3.3/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik IngressRouteTCP documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/tcp/ingressroutetcp/
- Traefik Helm chart values: https://github.com/traefik/traefik-helm-chart/blob/master/traefik/values.yaml
- Traefik metrics documentation: https://doc.traefik.io/traefik/reference/install-configuration/observability/metrics/
- Go crypto/tls cipher suite guidance: https://go.dev/blog/tls-cipher-suites
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic
- testssl.sh usage documentation: https://github-wiki-see.page/m/testssl/testssl.sh/wiki/Usage-Documentation

## Issues Found
- The Helm install command used outdated chart values (`ports.web.redirectTo.port` and `ports.websecure.tls.enabled`). Updated them to the current chart paths, `ports.web.http.redirections.entryPoint.to` and `ports.websecure.http.tls.enabled`.
- Several TLSOption examples configured TLS 1.3 cipher suites under `cipherSuites`. Traefik documents `cipherSuites` as applying only to TLS versions up to TLS 1.2, and Go does not expose configurable TLS 1.3 cipher suites. Removed TLS 1.3 cipher suite entries and clarified the TLS 1.3-only example.
- Removed `preferServerCipherSuites` from TLSOption examples because it is not present in the current Traefik TLSOption CRD options, and Go's current TLS stack ignores server cipher preference ordering.
- Corrected the PCI DSS example comment that described `sniStrict` as disabling client renegotiation. Traefik uses `sniStrict` to reject connections without a matching SNI value.
- Changed the development TLS example from `VersionTLS11` to `VersionTLS12` to keep examples aligned with current secure defaults and the post's own recommendation to use TLS 1.2 or higher.
- Split the TLSStore example so `defaultCertificate` and `defaultGeneratedCert` are not configured together. Traefik documents them as alternatives, with `defaultCertificate` taking precedence if both are set.
- Updated the metrics port-forward example from port 9000 to the Helm chart's default Prometheus metrics entrypoint port 9100.
- Replaced the unsupported `testssl.sh --cipher` example with `--cipher-per-proto`, which is documented by testssl.sh.
- Updated the OpenSSL cipher troubleshooting example to check a TLS 1.2 cipher name that OpenSSL reports via `openssl ciphers -v`.

## Review Notes
The post is technically relevant and salvageable. The remaining examples assume that referenced Kubernetes Secrets, Services, ACME resolvers, and DNS records already exist in the target cluster, which is appropriate for a focused TLS configuration guide.
