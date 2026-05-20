# Validation Summary: How to Configure ArgoCD to Skip TLS Verification for Git Repos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Git repositories over HTTPS and SSH
- Kubernetes Secrets and ConfigMaps
- TLS certificates and private CAs
- OpenSSL
- kubectl

## Sources Consulted
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd cert add-tls` command reference: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/commands/argocd_cert_add-tls/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd-repositories.yaml` example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repositories-yaml/
- Argo CD `argocd-repo-creds.yaml` example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repo-creds-yaml/

## Issues Found
- The `argocd-tls-certs-cm` example omitted the standard Argo CD labels used by declarative setup. Added `app.kubernetes.io/name: argocd-tls-certs-cm` and `app.kubernetes.io/part-of: argocd`.
- The post said repo-server watches `argocd-tls-certs-cm` directly. Official documentation describes this ConfigMap as mounted into `argocd-server` and `argocd-repo-server`, with Kubernetes updating mounted files after a delay. Updated the wording.
- The OpenSSL example claimed to download the CA certificate, but the command using `openssl x509` writes only the first certificate presented by the server. Updated the text to distinguish inspecting the presented server certificate from obtaining the CA certificate or full CA chain.
- The repo-server `/etc/ssl/certs` mounting example was not the documented Argo CD repository TLS trust path. Replaced it with the documented approach of adding hostname-keyed PEM entries to `argocd-tls-certs-cm`.

## Review Notes
The CLI flag `--insecure-skip-server-verification`, repository Secret key `insecure: "true"`, `argocd cert add-tls`, `argocd cert list --cert-type https`, and SSH known-host guidance are consistent with current Argo CD documentation. Argo CD notes that certificate changes may take up to a couple of minutes to propagate, depending on the Kubernetes environment.
