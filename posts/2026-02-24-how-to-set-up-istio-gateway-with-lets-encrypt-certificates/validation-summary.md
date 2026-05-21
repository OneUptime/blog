# Validation Summary: How to Set Up Istio Gateway with Let's Encrypt Certificates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio Gateway
- cert-manager
- Let's Encrypt ACME
- Kubernetes Ingress and IngressClass
- Kubernetes Certificate and ClusterIssuer resources
- TLS secrets
- Cloudflare DNS-01 validation

## Sources Consulted
- cert-manager installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- cert-manager Cloudflare DNS-01 documentation: https://cert-manager.io/docs/configuration/acme/dns01/cloudflare/
- Istio cert-manager integration documentation: https://preliminary.istio.io/latest/docs/ops/integrations/certmanager/
- Istio Secure Gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Kubernetes Ingress documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/kubernetes-ingress/
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt rate limits documentation: https://letsencrypt.org/docs/rate-limits/

## Issues Found
- The cert-manager install command used `v1.14.4`, which is outdated compared with the current official static manifest example. Updated it to `v1.20.2`.
- The HTTP-01 ClusterIssuer examples used `http01.ingress.class: istio`. Current cert-manager documentation recommends `ingressClassName` for most ingress controllers, and Istio documents `ingressClassName: istio` with an `IngressClass`. Updated both examples to `http01.ingress.ingressClassName: istio`.
- The HTTP-01 challenge section showed an Istio `Gateway` resource as the required ACME challenge setup, but the configured cert-manager solver creates temporary Kubernetes `Ingress` resources. Replaced that snippet with the matching Istio `IngressClass` configuration and clarified that cert-manager creates temporary Ingress resources, pods, and services.
- The renewal section stated that cert-manager defaults to renewing 30 days before expiration. Current cert-manager documentation says the default renewal time is two-thirds through the issued certificate duration. Reworded the section while preserving the practical 90-day Let's Encrypt timing.

## Review Notes
The Istio Gateway TLS `credentialName` usage, Certificate `secretName` mapping, Cloudflare DNS-01 API token fields, wildcard certificate DNS-01 requirement, and troubleshooting commands are technically consistent with the consulted official documentation. The post assumes the default Istio ingress gateway runs in `istio-system`; installations using a custom gateway namespace should place the Certificate and resulting Secret in that gateway workload namespace.
