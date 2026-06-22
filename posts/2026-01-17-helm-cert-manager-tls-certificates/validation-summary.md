# Validation Summary: Deploying cert-manager with Helm for Kubernetes TLS Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- cert-manager
- Helm
- Kubernetes
- Kubernetes Ingress
- ACME and Let's Encrypt
- DNS01 providers: Amazon Route53, Cloudflare, Google Cloud DNS
- HashiCorp Vault issuer
- Prometheus and PrometheusRule alerts

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Helm chart values for v1.20.2: https://raw.githubusercontent.com/cert-manager/cert-manager/v1.20.2/deploy/charts/cert-manager/values.yaml
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager DNS01 Route53 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Vault issuer documentation: https://cert-manager.io/docs/configuration/vault/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- Prometheus PromQL operator documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The `CertificateExpiringSoon` PromQL expression matched certificates that were already expired because any negative time-to-expiry is also less than seven days. I added a positive lower bound with `> 0` so the warning alert only applies to unexpired certificates that are expiring within seven days, leaving the separate `CertificateExpired` alert to handle expired certificates.

## Review Notes
- The post uses the legacy Jetstack Helm repository. Current cert-manager documentation recommends the OCI Helm chart for recent releases, but the Jetstack repository remains documented and supported, so this is not a correctness issue.
- The production values use `prometheus.servicemonitor`, which remains supported by the current chart. The latest cert-manager metrics documentation highlights `podmonitor` first, and the chart supports both as mutually exclusive options.
