# Validation Summary: How to implement Gateway TLS configuration with certificate references

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Gateway API
- Gateway, HTTPRoute, TLSRoute, and ReferenceGrant resources
- Kubernetes TLS Secrets
- cert-manager Certificates and ACME HTTP-01 Gateway solver
- OpenSSL
- PrometheusRule certificate expiration alerting
- curl and nmap TLS testing

## Sources Consulted
- Gateway API TLS configuration guide: https://gateway-api.sigs.k8s.io/guides/user-guides/tls/
- Gateway API API reference: https://gateway-api.sigs.k8s.io/reference/api-spec/main/spec/
- Gateway API TLSRoute reference: https://gateway-api.sigs.k8s.io/reference/api-types/tlsroute/
- cert-manager installation documentation: https://cert-manager.io/docs/installation/
- cert-manager HTTP-01 Gateway API solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- Kubernetes kubectl `create secret tls` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes kubectl `wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Local OpenSSL `req -help` output

## Issues Found
- The post described server certificate references as coming from Secrets, ConfigMaps, and cert-manager. Gateway listener `certificateRefs` have core support for Kubernetes TLS Secrets; ConfigMaps are used in other TLS contexts such as CA bundles, not as ordinary server certificate key pairs. Updated the description and introduction to focus on Kubernetes TLS Secrets and cert-manager-managed Secrets.
- The self-signed OpenSSL examples relied only on the certificate common name and used `-nodes`, which current OpenSSL marks deprecated. Updated the examples to use `-noenc` and add DNS subject alternative names.
- The curl test used the gateway IP with only a Host header, which does not set the TLS SNI name. Updated it to use `curl --resolve` so SNI and the HTTP Host match `example.com`.
- The cross-namespace `ReferenceGrant` example used `gateway.networking.k8s.io/v1beta1`. Updated it to the current `gateway.networking.k8s.io/v1` API version.
- The cert-manager installation command pinned an old release and did not enable Gateway API support. Replaced it with the current Gateway API CRD install plus the cert-manager Helm command with `config.enableGatewayAPI=true` and `crds.enabled=true`.
- The cert-manager `gatewayHTTPRoute` solver referenced the HTTPS-only `tls-gateway`. HTTP-01 Gateway solving requires an existing Gateway with a listener on port 80. Updated the text and parent reference to use an HTTP gateway.
- The multiple-certificate section incorrectly described multiple `certificateRefs` as certificate chaining. Updated it to describe implementation-specific multiple certificate support and clarified that certificate chains belong in the Secret's `tls.crt`.
- The TLSRoute example used the old `gateway.networking.k8s.io/v1alpha2` API. Updated it to `gateway.networking.k8s.io/v1`, matching current Gateway API where TLSRoute is Standard channel.
- The example Gateway status reason used `InvalidCertificateRef` for a missing certificate. Updated it to the standard `RefNotPermitted` cross-namespace reference example.

## Review Notes
The YAML snippets parse successfully with PyYAML. Full Kubernetes schema validation was not run because `kubectl` and Kubernetes-specific validators are not installed in this workspace.
