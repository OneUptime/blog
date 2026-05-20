# Validation Summary: How to Use ArgoCD CLI in CI/CD Containers

## Status
validated

## Post Type
Tutorial / CI/CD guide

## Technologies Covered
- Argo CD CLI
- GitOps
- Kubernetes
- GitHub Actions
- GitLab CI
- Jenkins
- CircleCI
- Docker/container images
- TLS and gRPC-Web networking

## Sources Consulted
- Argo CD CLI installation documentation: https://argo-cd.readthedocs.io/en/latest/cli_installation/
- Argo CD CLI environment variables documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/environment-variables/
- Argo CD command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD ingress documentation for gRPC/gRPC-Web context: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Local verification with `quay.io/argoproj/argocd:v2.10.0` CLI help output.

## Issues Found
- The GitLab CI examples used `argoproj/argocd:v2.10.0`, which did not resolve from Docker Hub during validation. Argo CD publishes the relevant container image at `quay.io/argoproj/argocd`, and the official documentation and security scan references use the `quay.io/argoproj/argocd` image path. Updated both examples to `quay.io/argoproj/argocd:v2.10.0`.

## Review Notes
- The CLI flags and environment variables used in the post (`ARGOCD_SERVER`, `ARGOCD_AUTH_TOKEN`, `ARGOCD_OPTS`, `--grpc-web`, `--auth-token`, `--server-crt`, `--insecure`, `--retry-limit`, `--health`, and `--timeout`) match official Argo CD documentation and v2.10.0 CLI help output.
- The installation commands match the official binary download URL pattern. In future revisions, consider noting that non-root CI containers may need to install the binary into a writable workspace directory or use `sudo install` where available.
