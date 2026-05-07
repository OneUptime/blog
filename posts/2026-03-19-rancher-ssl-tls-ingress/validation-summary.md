# Validation Summary: How to Configure SSL/TLS Termination for Ingress in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes Ingress
- TLS/SSL
- cert-manager
- Let's Encrypt ACME
- Helm
- Cloudflare DNS-01

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- `kubectl create secret tls` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- cert-manager Helm installation docs: https://cert-manager.io/docs/installation/helm/
- cert-manager HTTP-01 solver docs: https://cert-manager.io/docs/configuration/acme/http01/
- cert-manager ingress annotation docs: https://cert-manager.io/docs/usage/ingress/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- cert-manager Cloudflare DNS-01 docs: https://cert-manager.io/v1.16-docs/configuration/acme/dns01/cloudflare/
- cert-manager ACME troubleshooting docs: https://cert-manager.io/v1.15-docs/troubleshooting/acme/
- Rancher Helm Charts and Apps docs: https://ranchermanager.docs.rancher.com/v2.11/how-to-guides/new-user-guides/helm-charts-in-rancher
- Rancher ingress creation docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/load-balancer-and-ingress-controller/add-ingresses
- Rancher ingress configuration docs: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/kubernetes-resources-setup/load-balancer-and-ingress-controller/ingress-configuration

## Issues Found
- The ACME issuer examples used `admin@example.com`. cert-manager's troubleshooting docs note that `@example.com` is rejected as an invalid ACME contact domain, so the examples were updated to `admin@yourdomain.com`.
- The HTTP-01 solver examples used `http01.ingress.class: nginx`. Current cert-manager docs recommend `http01.ingress.ingressClassName` for most ingress controllers, including NGINX, and reserve `class` primarily for `ingress-gce`. Both issuer examples were updated accordingly.
- The Cloudflare DNS-01 example mixed API token authentication with the `email` field. Official Cloudflare provider docs show `apiTokenSecretRef` without `email`, and the API reference says `email` is only required for API-key authentication. The extra `email` field was removed.
- The Rancher UI instructions said you could "upload a new certificate" directly from the ingress certificate selector. Current Rancher ingress docs describe selecting an existing certificate secret from the drop-down, so that instruction was corrected.
- The monitoring and troubleshooting commands were tightened to use the canonical `orders` and `challenges` resource names, an explicit namespace for the TLS secret lookup, and a deployment-targeted `kubectl logs` command for cert-manager.

## Review Notes
- The Jetstack HTTP Helm repository method shown in the post is still supported, but current cert-manager installation docs prefer OCI charts for the latest releases.
- The NGINX redirect example is technically valid. `force-ssl-redirect` is mainly needed when TLS is offloaded outside the cluster, while `ssl-redirect` already applies when TLS is enabled on the ingress.
