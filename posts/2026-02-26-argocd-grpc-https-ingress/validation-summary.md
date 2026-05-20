# Validation Summary: How to Configure ArgoCD with gRPC and HTTPS Ingress

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Kubernetes Ingress
- ingress-nginx / Nginx Ingress annotations
- Traefik IngressRoute
- gRPC, gRPC-Web, HTTP/2, h2c
- TLS termination and SSL passthrough
- Argo CD CLI
- grpcurl

## Sources Consulted
- Argo CD Ingress Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD stable Ingress Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD command reference for `--grpc-web`: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/commands/argocd/
- ingress-nginx annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx gRPC example: https://kubernetes.github.io/ingress-nginx/examples/grpc/
- Traefik HTTP router rules and priority: https://doc.traefik.io/traefik/reference/routing-configuration/http/routing/rules-and-priority/
- Traefik v2 to v3 migration details: https://doc.traefik.io/traefik/migrate/v2-to-v3-details/
- gRPC reflection guide: https://grpc.io/docs/guides/reflection/

## Issues Found
- The post said Argo CD listens on a single port. I changed this to match the official Argo CD service behavior: the `argocd-server` service exposes port 443 for gRPC/HTTPS and port 80 for HTTP redirects unless the API server is run with TLS disabled.
- The post described gRPC detection as an exact `application/grpc` match. I changed this to "starts with `application/grpc`" because gRPC content types may include suffixes, and official ingress examples match or contain `application/grpc`.
- The Nginx TLS-termination examples did not say that Argo CD must run with TLS disabled when the ingress forwards plain HTTP/gRPC to the backend. I added the required `server.insecure: "true"` caveat for the grpc-web and two-host TLS-termination examples.
- The grpc-web section said `--grpc-web` must be specified every time. I corrected this to say it must be specified during login or stored in the CLI config, matching the CLI behavior and the later config section.
- The Traefik example used the deprecated v2 `Headers` matcher. I changed it to the Traefik v3 `Header` matcher, which matches current Traefik and current Argo CD documentation.

## Review Notes
- The current Argo CD documentation marks the kubernetes/ingress-nginx section as deprecated/retired, but the annotations remain relevant for clusters still running ingress-nginx.
- `grpcurl ... list` depends on gRPC server reflection being available; this is a useful test, but reflection support should be considered when troubleshooting.
