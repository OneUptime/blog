# Validation Summary: How to Configure NGINX Ingress Controller with TLS Termination on AKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Ingress
- ingress-nginx controller
- Helm
- TLS certificates and Kubernetes TLS Secrets
- OpenSSL
- cert-manager
- Let's Encrypt ACME HTTP-01 challenges

## Sources Consulted
- Kubernetes kubectl reference for `kubectl create secret tls`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- Kubernetes ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- Kubernetes ingress-nginx ConfigMap reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- Microsoft Learn AKS unmanaged ingress controller guide: https://learn.microsoft.com/en-us/troubleshoot/azure/azure-kubernetes/load-bal-ingress-c/create-unmanaged-ingress-controller
- Microsoft Learn AKS NGINX health probe annotation guidance: https://learn.microsoft.com/en-us/azure/aks/app-routing-nginx-configuration
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- OpenSSL local command help and installed OpenSSL 3.0.13 behavior for `openssl req -addext`.

## Issues Found
- The self-signed certificate command only set the certificate common name. Modern TLS clients validate DNS names from the Subject Alternative Name extension, so the command now adds `-addext "subjectAltName=DNS:myapp.example.com"`.
- The Ingress annotation comment said `force-ssl-redirect` was used to set the NGINX ingress class. The ingress class is set by `spec.ingressClassName`, so the comment now accurately describes the redirect annotation.
- The cert-manager `ClusterIssuer` example used the older HTTP-01 solver `class` field. Current cert-manager documentation recommends `ingressClassName` for most ingress controllers, so the example now uses `ingressClassName: nginx`.
- The troubleshooting section referred to DNS not pointing to the "cluster IP". For this setup, public DNS must point to the ingress controller service's external load balancer IP, so that wording was corrected.

## Review Notes
- The Helm command for ingress-nginx matches the current AKS guidance for the Azure Load Balancer health probe annotation.
- The cert-manager Helm command uses the legacy Jetstack Helm repository. That repository is still supported, but current cert-manager documentation recommends OCI charts for the newest releases.
- `kubectl`, `helm`, and an AKS cluster were not available locally, so live cluster execution was not performed. Commands and manifests were reviewed against official documentation instead.
