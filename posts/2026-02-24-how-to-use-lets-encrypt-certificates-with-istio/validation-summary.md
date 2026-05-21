# Validation Summary: How to Use Let's Encrypt Certificates with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ingress gateways
- Let's Encrypt ACME certificates
- cert-manager
- Kubernetes Ingress, IngressClass, Secrets, and kubectl
- HTTP-01 and DNS-01 ACME challenges
- AWS Route53 DNS solver
- Google Cloud DNS solver
- PrometheusRule monitoring

## Sources Consulted
- cert-manager kubectl installation documentation: https://cert-manager.io/docs/installation/kubectl/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager DNS-01 Route53 documentation: https://cert-manager.io/docs/configuration/acme/dns01/route53/
- cert-manager DNS-01 Google CloudDNS documentation: https://cert-manager.io/docs/configuration/acme/dns01/google/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/
- Istio secure gateways documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio Kubernetes Ingress documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/kubernetes-ingress/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Let's Encrypt challenge types documentation: https://letsencrypt.org/docs/challenge-types/

## Issues Found
- The cert-manager install command used the old `v1.14.0` static manifest. Updated it to `v1.20.2`, matching the current cert-manager install documentation at review time.
- The HTTP-01 `ClusterIssuer` examples used `http01.ingress.class: istio`. cert-manager now recommends `ingressClassName` for most Ingress controllers, and Istio documents `ingressClassName: istio` with an `IngressClass`. Updated both issuer examples to `ingressClassName: istio`.
- The HTTP-01 section said an Istio `Gateway` and `VirtualService` were needed for cert-manager challenge traffic, but cert-manager's Ingress HTTP-01 solver creates Kubernetes `Ingress` resources. Replaced the incomplete Istio `Gateway` example with the required Kubernetes `IngressClass` for Istio.

## Review Notes
- The Route53 DNS-01 example relies on ambient AWS credentials or separately configured Route53 authentication. This is valid, but production readers should still follow the cert-manager Route53 credential guidance for their environment.
- The Google Cloud DNS `ClusterIssuer` example references a service account secret; for a `ClusterIssuer`, cert-manager expects that secret in the cluster resource namespace, which is `cert-manager` by default.
- The automatic renewal wording is accurate for Let's Encrypt's 90-day certificates with cert-manager's default renewal timing, but cert-manager generally calculates renewal at two-thirds of the actual certificate duration unless `renewBefore` or `renewBeforePercentage` is set.
