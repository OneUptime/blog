# Validation Summary: How to Configure ArgoCD with External Certificate Managers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress and Secrets
- cert-manager Certificate, Issuer, and ClusterIssuer resources
- ACME / Let's Encrypt
- CyberArk Certificate Manager / Venafi
- AWS Certificate Manager and AWS Load Balancer Controller
- HashiCorp Vault PKI
- Helm
- kubectl
- OpenSSL

## Sources Consulted
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD Ingress configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- cert-manager Helm installation: https://cert-manager.io/docs/installation/helm/
- cert-manager ACME HTTP-01 solver documentation: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager Ingress usage documentation: https://cert-manager.io/docs/usage/ingress/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager CyberArk / Venafi issuer documentation: https://cert-manager.io/docs/configuration/venafi/
- cert-manager Vault issuer documentation: https://cert-manager.io/docs/configuration/vault/
- AWS Load Balancer Controller annotations: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- AWS Load Balancer Controller certificate discovery: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/cert_discovery/
- AWS Load Balancer Controller IngressClass documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/ingress_class/

## Issues Found
- The cert-manager Helm install command used the older `installCRDs=true` value. Updated it to the current documented `crds.enabled=true` value and added `--force-update` to the Jetstack repo command.
- The Let's Encrypt HTTP-01 solver used `ingress.class: nginx`. Updated it to `ingress.ingressClassName: nginx`, which cert-manager documents as the recommended field for most ingress controllers.
- The nginx Ingress example did not set `spec.ingressClassName`. Added `ingressClassName: nginx` to align with the solver and current Kubernetes Ingress usage.
- The Venafi section used outdated product naming and implied the old issuer name was current. Updated the prose to describe the CyberArk issuer, formerly known as the Venafi issuer, while preserving the `spec.venafi` API field that cert-manager still uses.
- The Venafi TPP credential example used `username=admin`. Updated it to `username=local:admin` because cert-manager's Venafi TPP documentation requires the username to include the identity provider prefix.
- The AWS ALB example used the deprecated `kubernetes.io/ingress.class` annotation and configured the backend as HTTPS on service port 443, then instructed users to enable Argo CD insecure mode. Updated the Ingress to use `spec.ingressClassName`, HTTP backend protocol, and service port 80 so it matches the insecure-mode configuration shown immediately afterward.
- The repo-server certificate section omitted Argo CD's hot-reload caveat. Added a note that `argocd-repo-server` pods must be restarted after creating or renewing the TLS secret.

## Review Notes
The ALB example is now consistent for TLS termination at the ALB with HTTP to Argo CD. Full Argo CD CLI gRPC support through an ALB can require the more advanced two-service routing pattern documented by Argo CD.
