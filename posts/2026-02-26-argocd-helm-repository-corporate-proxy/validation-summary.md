# Validation Summary: How to Add a Helm Repository Behind a Corporate Proxy in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Helm
- Corporate HTTP/HTTPS proxies
- TLS certificate trust configuration

## Sources Consulted
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD High Availability / repo-server execution timeout documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Helm `helm repo add` documentation: https://helm.sh/docs/helm/helm_repo_add/
- Go `net/http` proxy environment behavior: https://pkg.go.dev/net/http

## Issues Found
- The post described mounting a custom CA bundle and setting `HELM_TLS_CA_FILE` for Helm operations. Helm's documented repository TLS option is `--ca-file`, and Argo CD documents `argocd-tls-certs-cm` as the supported declarative mechanism for repository server certificate trust. Replaced that example with an `argocd-tls-certs-cm` example using repository hostnames as keys.
- The post implied proxy environment variables were the only Argo CD mechanism for Helm repository proxying. Current Argo CD documentation also supports per-repository `proxy` and `noProxy` fields and falls back to standard repo-server proxy environment variables when custom proxy config is absent. Updated the wording and repository example to reflect both supported approaches.
- The troubleshooting section still referenced mounting a custom CA bundle after the TLS example was corrected. Updated it to direct readers to configure the proxy CA in `argocd-tls-certs-cm` for each repository hostname.

## Review Notes
The remaining Kubernetes YAML, Argo CD repository Secret fields, Argo CD Application example, `kubectl patch` command form, `argocd repo list`, proxy environment variables, and `ARGOCD_EXEC_TIMEOUT` usage are technically plausible based on the reviewed documentation. The environment did not have `kubectl` installed, so command validation was performed against official Kubernetes documentation rather than local CLI help.
