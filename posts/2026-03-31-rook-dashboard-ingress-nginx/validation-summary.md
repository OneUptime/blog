# Validation Summary: How to Expose the Ceph Dashboard via Ingress with Nginx in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Dashboard
- Nginx Ingress Controller
- Kubernetes Ingress API (networking.k8s.io/v1)
- TLS / SSL passthrough
- cert-manager (referenced)

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Nginx Ingress Controller annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Nginx Ingress Controller SSL passthrough documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/#ssl-passthrough

## Issues Found
No technical issues found.

## Review Notes
- The Ingress manifests closely follow patterns from the official Rook documentation and are syntactically correct for the `networking.k8s.io/v1` API.
- All nginx ingress annotations (`backend-protocol`, `ssl-passthrough`, `ssl-redirect`, `proxy-ssl-verify`) are valid and correctly named.
- The service name `rook-ceph-mgr-dashboard` and port `8443` match the defaults created by Rook when the dashboard is enabled.
- The dashboard password retrieval command uses the correct secret name (`rook-ceph-dashboard-password`) and key (`password`).
- The Helm values for enabling SSL passthrough (`controller.extraArgs.enable-ssl-passthrough`) follow the standard nginx ingress Helm chart structure.
- The post correctly notes that SSL passthrough must be explicitly enabled on the Nginx Ingress Controller, which is a common gotcha for users.
