# Validation Summary: How to Set Up cert-manager for Ceph Dashboard TLS in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- cert-manager (Kubernetes certificate management)
- Rook-Ceph (Ceph Dashboard)
- Kubernetes Ingress (networking.k8s.io/v1)
- NGINX Ingress Controller
- Let's Encrypt (ACME protocol)
- OpenSSL (certificate verification)

## Sources Consulted
- cert-manager official documentation: https://cert-manager.io/docs/
- cert-manager ClusterIssuer reference: https://cert-manager.io/docs/configuration/acme/
- cert-manager Ingress annotation docs: https://cert-manager.io/docs/usage/ingress/
- Rook-Ceph Dashboard documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/
- NGINX Ingress Controller annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Let's Encrypt ACME directory: https://letsencrypt.org/docs/acme-protocol-updates/

## Issues Found
No technical issues found.

## Review Notes
- The renewal claim of "30 days before expiration by default" is effectively correct for Let's Encrypt 90-day certificates. The underlying cert-manager mechanism (v1.11+) actually renews at 2/3 of the certificate's total lifetime, which equates to 30 days before expiry for 90-day certs. This distinction could matter if a different CA issuing longer-lived certificates were used.
- The Ingress correctly includes `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"` and `nginx.ingress.kubernetes.io/proxy-ssl-verify: "off"`, which are both necessary because the Ceph Dashboard backend serves HTTPS with a self-signed certificate.
- The service name `rook-ceph-mgr-dashboard` and port `8443` match the default Rook-Ceph dashboard service configuration.
- All YAML manifests use current, non-deprecated API versions (`cert-manager.io/v1`, `networking.k8s.io/v1`).
