# Validation Summary: How to Build ArgoCD Repository Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD repository TLS certificates
- Kubernetes ConfigMaps, CronJobs, ServiceAccounts, RBAC, and Deployments
- Argo CD CLI
- Helm chart values
- OpenSSL certificate inspection

## Sources Consulted
- Argo CD private repository documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Argo CD declarative setup documentation for `argocd-tls-certs-cm`: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD `argocd cert` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cert/
- Argo CD `argocd cert add-tls` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cert_add-tls/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repo_add/
- Argo CD Helm chart values and `argocd-tls-certs-cm` template: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml and https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/templates/argocd-configs/argocd-tls-certs-cm.yaml
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- OpenSSL `s_client` documentation: https://docs.openssl.org/3.0/man1/openssl-s_client/

## Issues Found
- The TLS flow diagram labeled the connecting component as `ArgoCD Server`. Updated it to `ArgoCD Repo Server`, which is the Argo CD component responsible for repository access.
- The first OpenSSL command was described as retrieving the certificate chain, but piping to `openssl x509` writes only the first certificate. Updated the wording to say it retrieves the leaf certificate.
- The chain extraction text implied `-showcerts` necessarily gives the full chain. Updated the wording to say it saves the certificate chain presented by the server.
- The corporate CA section suggested using a wildcard-style ConfigMap key. Argo CD documents certificate entries as per repository server hostname, so the text now says to repeat the CA certificate under each relevant hostname.
- The certificate chain section recommended adding a full server-to-root chain. Argo CD expects either the self-signed server certificate or the CA certificate(s) used to verify the server certificate, so the section now describes adding the missing CA bundle.
- The rotation CronJob used `bitnami/kubectl:latest` while the script also requires `openssl`. Updated the image to an explicit placeholder that must include both `kubectl` and `openssl`.
- The troubleshooting section stated that Argo CD caches certificates and requires a repo-server restart. Argo CD documentation says ConfigMap updates may take time to appear in pods, so the text now frames restart as an immediate-propagation option.
- The best-practices section implied a CA certificate covers every signed server automatically. Updated it to clarify that Argo CD still needs the CA configured for each repository server hostname.

## Review Notes
The main Argo CD CLI commands, ConfigMap name, hostname-key behavior, repository `insecure` secret field, Helm `configs.tls.certificates` value, and Kubernetes CronJob/RBAC structures were otherwise consistent with current official documentation. The CronJob remains an example and assumes the referenced custom image is built with the required tools.
