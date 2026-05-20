# Validation Summary: How to Configure ArgoCD with TLS Passthrough

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress
- ingress-nginx
- Traefik IngressRouteTCP
- HAProxy Kubernetes Ingress Controller
- Istio Gateway and VirtualService
- cert-manager
- TLS, SNI, HTTPS, and gRPC

## Sources Consulted
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD TLS documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD command parameters documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Traefik IngressRouteTCP documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/tcp/ingressroutetcp/
- HAProxy Kubernetes Ingress Controller Service annotations documentation: https://www.haproxy.com/documentation/kubernetes-ingress/community/configuration-reference/service/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- cert-manager Ingress and ACME HTTP01 behavior documentation: https://cert-manager.io/docs/usage/ingress/

## Issues Found
- The Argo CD certificate section incorrectly showed `server.tls.cert.file` and `server.tls.key.file` ConfigMap settings and a manual Deployment mount as the way to configure the API server certificate. Current Argo CD documentation says `argocd-server` automatically uses a valid `argocd-server-tls` secret containing `tls.crt` and `tls.key`, and hot-reloads that secret. I replaced the incorrect ConfigMap and Deployment instructions with the documented secret-based behavior.
- The HAProxy example placed `haproxy.org/ssl-passthrough` on the Ingress. HAProxy Kubernetes Ingress Controller documentation lists this as a Service annotation. I changed the section to annotate the existing `argocd-server` Service and left the Ingress as the host routing object.
- The cert-manager section said DNS01 is mandatory with passthrough. DNS01 is the safest and most common fit, but HTTP01 can still work if cert-manager can expose a separate HTTP solver on port 80 that is not forced through the TLS passthrough route. I changed the wording to prefer DNS01 and clarify the HTTP01 caveat.

## Review Notes
The ingress-nginx, Traefik, and Istio passthrough examples use current resource fields and annotations according to the official documentation consulted. The Argo CD CLI/gRPC explanation is consistent with Argo CD documentation that exposes gRPC/HTTPS on service port 443 and with the documented need for `--grpc-web` primarily when gRPC over HTTP/2 is not available through the ingress path.
