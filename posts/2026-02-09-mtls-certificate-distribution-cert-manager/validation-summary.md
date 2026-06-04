# Validation Summary: How to Implement Mutual TLS Certificate Distribution Using cert-manager

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- cert-manager Certificate and ClusterIssuer resources
- TLS and mutual TLS
- OpenSSL
- nginx
- curl
- Python requests
- Prometheus Operator PrometheusRule

## Sources Consulted
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/v1.15-docs/devops-tips/prometheus-metrics/
- cert-manager v1.20 source metrics definitions and tests: https://github.com/cert-manager/cert-manager
- nginx SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- NGINX SSL termination documentation: https://docs.nginx.com/nginx/admin-guide/security-controls/terminating-ssl-http/
- Local OpenSSL CLI help and generated certificate inspection
- Local curl CLI help

## Issues Found
- The OpenSSL CA generation command did not explicitly set CA basic constraints or certificate signing key usage. Some OpenSSL configurations may add these defaults, but cert-manager's CA issuer documentation states that CA certificates should have `basicConstraints` with `isCA` set to true and generally need certificate signing usage. Added `-addext` flags for `basicConstraints=critical,CA:TRUE` and `keyUsage=critical,keyCertSign,cRLSign`.
- The nginx example used `$ssl_client_cert` when forwarding the client certificate. nginx documents this variable as deprecated and recommends `$ssl_client_escaped_cert`. Updated the header value to `$ssl_client_escaped_cert`.
- The monitoring command filtered certificates by `cert-type=mtls`, but none of the example Certificate resources set that label. Changed the command to list all cert-manager Certificate resources across namespaces.
- The certificate status command read `.status.conditions[0].status`, which depends on condition ordering. Updated it to select the `Ready` condition by type.
- The Prometheus alert filtered `certmanager_certificate_expiration_timestamp_seconds` by a nonexistent `usage` label. Updated the expression to use the current `certmanager_certificate_not_after_timestamp_seconds` metric without the invalid label filter and included the namespace label in the alert description.

## Review Notes
The cert-manager resource examples use the current `cert-manager.io/v1` API and valid `Certificate` fields. The article's manual ConfigMap-based CA distribution is technically workable, but cert-manager's documentation also recommends considering trust-manager for safer CA bundle distribution in larger clusters.
