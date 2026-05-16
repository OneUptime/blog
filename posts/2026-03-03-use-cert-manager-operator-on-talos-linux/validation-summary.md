# Validation Summary: How to Use Cert-Manager Operator on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- cert-manager
- Helm
- ACME / Let's Encrypt
- HTTP-01 and DNS-01 challenges
- AWS Route53
- Cloudflare DNS
- PrometheusRule monitoring

## Sources Consulted
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager ACME issuer documentation: https://cert-manager.io/docs/configuration/acme/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager Route53 DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager Cloudflare DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- cert-manager Prometheus metrics documentation: https://cert-manager.io/docs/devops-tips/prometheus-metrics/
- cert-manager Helm chart metadata on Artifact Hub: https://artifacthub.io/packages/helm/cert-manager/cert-manager
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Talos Linux philosophy documentation: https://www.talos.dev/v1.10/learn-more/philosophy/

## Issues Found
- The Helm install example used the older `installCRDs=true` chart value. Current cert-manager documentation uses `crds.enabled=true`, and Artifact Hub marks `installCRDs` as deprecated. Updated the install command accordingly.
- The Helm install example used the legacy Jetstack HTTP Helm repository flow. Current cert-manager documentation recommends installing recent cert-manager versions from the OCI chart registry at `oci://quay.io/jetstack/charts/cert-manager`. Updated the command to use the OCI chart and pinned the current documented chart version, `v1.20.2`.
- The ACME HTTP-01 solver examples used `ingress.class: nginx`. Current cert-manager documentation recommends `ingressClassName` for most ingress controllers, including nginx; `class` is only recommended for ingress-gce. Updated both Let's Encrypt issuer examples to use `ingressClassName: nginx`.
- The sample application Ingress did not specify an ingress class. Kubernetes documentation recommends using `spec.ingressClassName` unless a default IngressClass is intentionally configured. Added `ingressClassName: nginx` to match the nginx examples.

## Review Notes
The remaining cert-manager resource snippets use the current `cert-manager.io/v1` APIs and valid ACME, Cloudflare, Route53, self-signed, CA issuer, Certificate, and PrometheusRule structures. The Route53 example assumes AWS credentials are supplied through an IAM role or explicit access key fields as noted in the comments.
