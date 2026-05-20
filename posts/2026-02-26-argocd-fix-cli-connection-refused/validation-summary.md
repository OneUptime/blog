# Validation Summary: How to Fix ArgoCD CLI Connection Refused

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD CLI
- Argo CD API server
- Kubernetes pods, services, ingresses, and network policies
- TLS, gRPC, and gRPC-Web
- Shell networking tools including `nc`, `openssl`, and `nslookup`

## Sources Consulted
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd context` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_context/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd account can-i` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_can-i/
- Argo CD `argocd version` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_version/
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- Argo CD getting started documentation: https://argo-cd.readthedocs.io/en/latest/getting_started/

## Issues Found
- The post used `argocd context list`, but the current Argo CD CLI lists contexts with `argocd context`. Updated both examples.
- The self-signed certificate example used `argocd login --certificate-authority`, which is not the Argo CD server certificate flag documented for `argocd login`. Updated it to `--server-crt`.
- The insecure-mode check only inspected the container `command` field, which can miss flags stored in `args`. Updated the `kubectl` JSONPath to print both `command` and `args` for the `argocd-server` container.
- The timeout example used `--server-timeout`, which is not a current `argocd app list` flag. Replaced the section with `--http-retry-max`, a documented Argo CD CLI option for retrying HTTP connection establishment.
- The summary said production setups should always use `--grpc-web` behind an ingress controller. Updated it to specify ingress controllers that do not proxy HTTP/2 gRPC correctly, because Argo CD can also use gRPC over HTTP/2 when the ingress supports it.

## Review Notes
The remaining troubleshooting commands are generally correct but assume common defaults: the Argo CD namespace is `argocd`, the server service is named `argocd-server`, and the CLI is configured for the target Argo CD server. The debug script also assumes port 443 and requires local tools such as `nslookup`, `nc`, and `openssl`.
