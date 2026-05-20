# Validation Summary: How to Use Self-Signed Certificates with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- TLS / X.509 certificates
- OpenSSL
- mkcert
- Git repositories over HTTPS
- Kubernetes kubeconfig cluster credentials

## Sources Consulted
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD `argocd cert add-tls` command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_cert_add-tls/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD private repositories TLS documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative setup documentation for repository and cluster secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Kubernetes `kubectl create secret tls` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/
- OpenSSL `openssl-x509` documentation: https://docs.openssl.org/3.3/man1/openssl-x509/
- OpenSSL X.509v3 configuration documentation: https://docs.openssl.org/3.4/man5/x509v3_config/
- mkcert README: https://github.com/FiloSottile/mkcert

## Issues Found
- The post used `argocd login ... --certificate-authority ca.crt`, but current Argo CD CLI docs list `--server-crt` for providing the server certificate file to the CLI. Changed the examples to `--server-crt`.
- The post suggested `ARGOCD_SERVER_CERTIFICATE_AUTHORITY_DATA`, which is not documented as an Argo CD CLI option. Changed it to use the documented `ARGOCD_OPTS` mechanism with `--server-crt ca.crt`.
- The post implied `argocd-server` must be restarted after changing `argocd-server-tls`. Official Argo CD TLS docs state `argocd-server` hot-reloads this secret. Updated the wording to say Argo CD reloads it automatically, with restart only as a force-reload option.
- The migration checklist referenced removing old `--certificate-authority` flags. Updated that to `--server-crt`.

## Review Notes
The OpenSSL certificate generation flow was syntax-checked locally with OpenSSL 3.0.13 and verified successfully with `openssl verify`. The local environment did not have `argocd` or `kubectl` installed, so those command flags were checked against official command references instead of local `--help` output.
