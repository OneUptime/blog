# Validation Summary: How to Fix ArgoCD Ingress Redirect Loop Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress
- ingress-nginx
- Traefik IngressRoute
- AWS Load Balancer Controller / ALB
- GKE Ingress and FrontendConfig
- kubectl and curl troubleshooting commands

## Sources Consulted
- Argo CD ingress configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD argocd-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx ConfigMap documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/configmap/
- ingress-nginx TLS/HTTPS documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- Traefik Kubernetes IngressRoute documentation: https://doc.traefik.io/traefik/v3.4/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- AWS Load Balancer Controller SSL redirect documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/tasks/ssl_redirect/
- AWS Load Balancer Controller annotations documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/v2.4/guide/ingress/annotations/
- GKE Ingress configuration documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/ingress-configuration
- GKE Ingress concepts documentation: https://cloud.google.com/kubernetes-engine/docs/concepts/ingress

## Issues Found
- The nginx TLS passthrough snippet only showed `ssl-passthrough`. Added `backend-protocol: "HTTPS"` and noted that ingress-nginx must be started with `--enable-ssl-passthrough`, matching Argo CD and ingress-nginx documentation.
- The post described `nginx.ingress.kubernetes.io/use-forwarded-headers` as an Ingress annotation. Corrected it to the ingress-nginx controller ConfigMap key `use-forwarded-headers`.
- The HTTPS backend section implied certificate verification is always something the ingress must handle or skip. Added that ingress-nginx disables proxied backend certificate verification by default unless `proxy-ssl-verify` is enabled.
- The AWS ALB example configured SSL redirect with only an HTTPS listener. Updated `listen-ports` to include both HTTP and HTTPS and added the required `certificate-arn` placeholder.
- The AWS ALB text said ALB always sends HTTP to the backend. Changed this to say it sends HTTP when `alb.ingress.kubernetes.io/backend-protocol: HTTP` is set.
- The GCE section omitted how to attach a `FrontendConfig` and stated that GCE always sends HTTP to the backend. Added the required Ingress annotation name and changed the wording to describe HTTP as the default backend protocol.

## Review Notes
The core recommendation, `server.insecure: "true"` when TLS is terminated before Argo CD, matches the official Argo CD ingress documentation. The guide focuses on browser/UI access; production setups that need Argo CD CLI gRPC through the same hostname may require extra ingress rules, gRPC-Web, or TLS passthrough depending on the ingress controller.
