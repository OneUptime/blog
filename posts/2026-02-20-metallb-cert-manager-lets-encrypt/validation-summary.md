# Validation Summary: How to Use MetalLB with cert-manager and Let's Encrypt for TLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- cert-manager
- Let's Encrypt / ACME
- Ingress
- Helm
- Prometheus Operator

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager ACME HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Ingress usage and ingress-shim documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager API reference for Issuer, ClusterIssuer, Certificate, and Cloudflare DNS-01 fields: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager v1.20.2 metrics source for certificate metric names and labels: https://github.com/cert-manager/cert-manager/blob/v1.20.2/internal/collectors/certificate_collector.go
- MetalLB concepts and LoadBalancer IP behavior: https://metallb.io/concepts/
- MetalLB layer 2 behavior: https://metallb.io/concepts/layer2/
- Let's Encrypt challenge type documentation: https://letsencrypt.org/docs/challenge-types/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Prometheus Operator PrometheusRule API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post described MetalLB as assigning an IP directly to the Ingress controller. MetalLB assigns external IPs to Kubernetes `LoadBalancer` Services, so the wording was corrected to refer to the Ingress controller's LoadBalancer Service.
- The troubleshooting command used `kubectl describe certificaterequest <cert-name>`, but cert-manager generated `CertificateRequest` objects are not necessarily named the same as the `Certificate`. The command was changed to select CertificateRequests by the `cert-manager.io/certificate-name=<cert-name>` label.

## Review Notes
- The cert-manager Helm command uses the current `crds.enabled=true` value, which is correct for recent cert-manager releases.
- The HTTP-01 solver examples use `ingressClassName`, which is the current recommended field for most Ingress controllers.
- The Cloudflare DNS-01 example is valid. With API token authentication, the `email` field is optional, but including it does not make the manifest invalid.
- The Prometheus certificate metric names and `condition` label values are correct for current cert-manager metrics.
