# Validation Summary: How to Configure ArgoCD Server for gRPC-Web

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD Helm chart
- Kubernetes Ingress
- NGINX Ingress
- AWS Application Load Balancer
- gRPC and gRPC-Web

## Sources Consulted
- Argo CD ingress configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD `argocd-server` command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD CLI command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd/
- Argo CD CLI environment variables: https://argo-cd.readthedocs.io/en/latest/user-guide/environment-variables/
- Argo CD Helm chart values: https://raw.githubusercontent.com/argoproj/argo-helm/main/charts/argo-cd/values.yaml
- AWS Application Load Balancer target group protocol versions: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- gRPC-Web project documentation and wire format notes: https://github.com/grpc/grpc-web

## Issues Found
- The post incorrectly described `--grpc-web` as an `argocd-server` flag and showed it in Deployment and Helm `server.extraArgs` examples. The official `argocd-server` command reference does not include this flag; it is an Argo CD CLI flag. Updated the server section to explain that Argo CD server-side gRPC-Web support is built in and that proxy/ingress forwarding is the relevant server-side concern.
- The root path example incorrectly paired server `--rootpath` with server `--grpc-web`. Removed the invalid server flag and clarified that CLI users should use `--grpc-web-root-path` for matching non-root paths.
- The post used a nonexistent `ARGOCD_GRPC_WEB=true` environment variable. Official Argo CD docs use `ARGOCD_OPTS="--grpc-web"` for default CLI options. Updated the example.
- The TLS-terminating proxy example included the invalid server `--grpc-web` flag. Removed it and left the valid `--insecure` server argument.
- The troubleshooting section told readers to verify a server `--grpc-web` flag. Updated it to verify ingress routing, root path alignment, and running server arguments instead.
- The AWS ALB section stated that ALB does not support HTTP/2 to backends. AWS documentation says ALB can use HTTP/2 or gRPC target protocol versions, while HTTP/1.1 remains the default. Updated the wording to frame gRPC-Web as useful when using the default HTTP/1.1 target path.
- The performance section claimed binary gRPC-Web frames are always base64 encoded and mentioned server-sent events. Official gRPC-Web docs distinguish base64 `grpcwebtext` mode from binary `grpcweb` mode, and browser streaming support is limited. Updated the explanation accordingly.

## Review Notes
The post is now technically valid as a practical guide, but Argo CD ingress behavior remains environment-specific. Operators should still confirm the exact ingress controller and load balancer annotations for the controller versions they run.
