# Validation Summary: How to Configure ArgoCD Behind a Reverse Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress
- ingress-nginx
- NGINX
- Traefik
- HAProxy
- AWS Application Load Balancer
- Google Cloud Load Balancer / GKE Ingress
- gRPC, gRPC-Web, HTTP/2, TLS passthrough

## Sources Consulted
- Argo CD official ingress documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- ingress-nginx annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx gRPC example: https://kubernetes.github.io/ingress-nginx/examples/grpc/
- ingress-nginx regex path matching documentation: https://kubernetes.github.io/ingress-nginx/user-guide/ingress-path-matching/
- ingress-nginx TLS/HTTPS documentation: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- AWS Load Balancer Controller annotations documentation: https://kubernetes-sigs.github.io/aws-load-balancer-controller/latest/guide/ingress/annotations/
- Traefik IngressRouteTCP documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/tcp/ingressroutetcp/
- HAProxy gRPC configuration documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/protocol-support/grpc/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- GKE managed certificates documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/managed-certs

## Issues Found
1. **Overstated TLS termination limitation**: The post said TLS termination breaks gRPC because gRPC needs HTTP/2 end-to-end. This was too broad. TLS termination works when the proxy forwards HTTP/2/h2c to Argo CD; it breaks native gRPC when the backend leg is HTTP/1.1. Updated the explanation.
2. **Misleading ingress-nginx gRPC-Web annotation comment**: `nginx.ingress.kubernetes.io/backend-protocol: "HTTP"` does not enable gRPC-Web by itself. It selects HTTP to the backend, while the Argo CD CLI must use `--grpc-web`. Updated the comment and added the native gRPC caveat.
3. **Missing ingress-nginx SSL passthrough requirement**: SSL passthrough requires the controller to be started with `--enable-ssl-passthrough`. Added this requirement and clarified that `--insecure` is only needed for untrusted/self-signed certificates.
4. **Incorrect standalone NGINX native gRPC example**: The `location /argocd.` block would not correctly route native Argo CD gRPC methods. Removed that block and documented using `--grpc-web` with the HTTP/1.1 proxy example.
5. **Traefik TLS termination example did not preserve native gRPC**: A plain Ingress to port 80 is not enough for native gRPC. Replaced it with Argo CD's documented `IngressRoute` pattern that routes `Content-Type: application/grpc` with `scheme: h2c`.
6. **HAProxy frontend did not negotiate HTTP/2**: Native gRPC requires HTTP/2 on the client side. Added `alpn h2,http/1.1` and changed the content-type ACL to prefix matching for `application/grpc*`.
7. **AWS ALB native gRPC wording was incomplete**: The single-service example did not configure a GRPC target group or header-based routing. Updated the text to identify it as a gRPC-Web setup and noted the separate target group requirement for native gRPC.
8. **Subpath configuration was inconsistent**: The example set `server.rootpath` but rewrote `/argocd` away before forwarding to Argo CD, and omitted `server.basehref`. Added `server.basehref`, removed the rewrite, used a Prefix path, and added the CLI `--grpc-web-root-path` command.

## Review Notes
- The remaining Kubernetes manifests use the current `networking.k8s.io/v1` Ingress API and required `pathType` fields.
- The GKE managed certificate annotation is valid, but production GKE deployments may still need service-specific health check configuration depending on how the Argo CD Service is exposed.
- The AWS ALB section now presents the simpler gRPC-Web path; a future post could add a full native gRPC ALB example with a second Service and `alb.ingress.kubernetes.io/conditions`.
