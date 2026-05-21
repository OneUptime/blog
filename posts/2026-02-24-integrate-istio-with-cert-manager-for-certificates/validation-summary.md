# Validation Summary: How to Integrate Istio with cert-manager for Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- cert-manager
- cert-manager istio-csr
- Kubernetes TLS Secrets and custom resources
- ACME HTTP-01 and DNS-01 challenges
- Let's Encrypt
- AWS Route53 DNS validation
- Prometheus alerting

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager ACME HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager ACME DNS-01 Route53 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager istio-csr installation documentation: https://cert-manager.io/docs/usage/istio-csr/installation/
- cert-manager istio-csr getting started documentation: https://cert-manager.io/docs/usage/istio-csr/getting-started/
- Istio secure ingress task: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/

## Issues Found
- The cert-manager Helm install used `installCRDs=true`. Updated it to the current documented chart value, `crds.enabled=true`.
- The HTTP-01 solver used `ingress.class: istio`. Updated it to `ingress.ingressClassName: istio`, which is the current cert-manager field for setting the Kubernetes Ingress class.
- The istio-csr section implied it could be added after Istio was already installed and included an incomplete Helm command for `app.tls.rootCAFile`. Updated the wording to say istio-csr should be installed before Istio, added the issuer settings, and added the volume and volumeMount settings needed for the configured root CA file.
- The IstioOperator snippet included `ISTIO_META_CERT_SIGNER`, which is not part of the documented cert-manager istio-csr Istio configuration. Removed it and kept the documented `caAddress` and `ENABLE_CA_SERVER=false` settings.
- The istio-csr explanation said cert-manager could use whatever backend CA is configured. Tightened this to a CA issuer suitable for Istio workload identities, since ACME issuers such as Let's Encrypt are not appropriate for Istio workload certificate signing.
- The certificate health command assumed the first Certificate condition was the Ready condition. Replaced it with a custom-columns command that reads the Ready condition by type and also shows the expiration date.
- The troubleshooting commands queried ACME `orders` and `challenges` in the `cert-manager` namespace. Updated them to query `istio-system`, matching the namespace of the example `Certificate` where the related ACME resources are created.

## Review Notes
The Route53 DNS-01 example is intentionally minimal and remains technically plausible, but real deployments should follow the cert-manager Route53 guidance for IRSA, ambient credentials, or explicit secret-backed credentials. The Gateway example is valid for Istio gateway SDS when the referenced TLS Secret is in the same namespace as the Gateway workload.
