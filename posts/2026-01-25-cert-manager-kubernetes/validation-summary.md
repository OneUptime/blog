# Validation Summary: How to Implement Certificate Management with cert-manager

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- cert-manager
- Helm
- Let's Encrypt ACME
- HTTP-01 and DNS-01 challenges
- Cloudflare DNS-01 solver
- Kubernetes Ingress
- Prometheus Operator PrometheusRule
- OpenSSL

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager supported releases documentation: https://cert-manager.io/docs/releases/
- cert-manager ACME issuer and solver selector documentation: https://cert-manager.io/docs/configuration/acme/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Cloudflare DNS-01 documentation and API reference: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/ and https://cert-manager.io/docs/reference/api-docs/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Ingress annotation documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager CA issuer documentation: https://cert-manager.io/docs/configuration/ca/
- Let's Encrypt challenge type documentation: https://letsencrypt.org/docs/challenge-types/

## Issues Found
- The introduction claimed cert-manager handles certificate revocation. cert-manager automates issuance and renewal, but does not generally provide a certificate revocation workflow. Updated the wording to remove revocation.
- The prerequisites listed Kubernetes v1.19+, which is no longer accurate for current cert-manager releases. Updated this to require a Kubernetes version supported by the chosen cert-manager release.
- The Helm example used cert-manager v1.13.3, the legacy chart repository flow, and `installCRDs=true`. Updated the example to current cert-manager v1.20.2, the recommended OCI chart, and `crds.enabled=true`. Also enabled `prometheus.podmonitor.enabled=true` so the monitoring examples are scrapeable with Prometheus Operator.
- The HTTP-01 solver examples used `ingress.class` for nginx. cert-manager recommends `ingress.ingressClassName` for nginx-style controllers, so both examples were updated.
- The wildcard solver used `selector.dnsZones: "*.example.com"`, which is not the right selector for matching wildcard and apex certificate names. Updated it to exact `dnsNames` for `*.example.com` and `example.com`.
- The Cloudflare DNS-01 token example included `email`, which is only required for Cloudflare API key authentication. Removed it from the API token example.
- The Prometheus alert used `certmanager_certificate_renewal_errors_total`, which is not a documented cert-manager metric. Replaced it with an overdue-renewal alert using `certmanager_certificate_renewal_timestamp_seconds`.
- The troubleshooting script selected cert-manager logs with the old `app=cert-manager` label. Updated it to current Helm labels for the controller pod.

## Review Notes
The internal CA examples are syntactically valid, but production PKI needs a separate plan for CA rotation, trust distribution, and reissuing leaf certificates when a CA changes. The YAML snippets were syntax-checked after editing.
