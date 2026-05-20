# Validation Summary: How to Fix x509 Certificate Signed by Unknown Authority in ArgoCD

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- TLS / X.509 certificates
- Git and Helm repositories
- OIDC / Dex SSO
- OpenSSL
- kubectl

## Sources Consulted
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD Declarative Setup documentation for `argocd-tls-certs-cm`: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#repositories-using-self-signed-tls-certificates-or-are-signed-by-custom-ca
- Argo CD TLS Configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD User Management / OIDC root CA documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/#configuring-a-custom-root-ca-certificate-for-communicating-with-the-oidc-provider
- Argo CD `argocd cert add-tls` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cert_add-tls/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Dex OIDC connector documentation: https://dexidp.io/docs/connectors/oidc/
- Dex OIDC connector source for `rootCAs`: https://github.com/dexidp/dex/blob/master/connector/oidc/oidc.go

## Issues Found
- The certificate-chain extraction `awk` command kept writing non-certificate lines into output files. Replaced it with an `awk` command that only writes lines between `BEGIN CERTIFICATE` and `END CERTIFICATE`.
- The post said the last certificate in a server-sent chain is usually the root CA. Servers often omit the root CA, so this was changed to inspect the chain and choose the issuing CA certificate, or obtain the root CA from an administrator.
- The OIDC section incorrectly suggested an `--oidc-ca` flag and `server.oidc.tls.insecure` setting. Replaced this with Argo CD's documented `oidc.config.rootCA` setting and a Dex connector example that references a mounted CA file.
- The system-wide bundle example used `SSL_CERT_DIR` while mounting a single CA bundle file. Changed it to `SSL_CERT_FILE`, which matches the file-based bundle being mounted.
- The internal component TLS example suggested deleting `argocd-repo-server-tls` for an invalid certificate. Updated it to replace the secret with `tls.crt`, `tls.key`, and `ca.crt`, then restart the repo-server as required by Argo CD TLS documentation.

## Review Notes
The repository and Helm TLS examples are correct for Argo CD repository-server trust when using `argocd-tls-certs-cm` or `argocd cert add-tls`. Argo CD documentation notes that certificate changes can take a short time to propagate through Kubernetes volume updates.
