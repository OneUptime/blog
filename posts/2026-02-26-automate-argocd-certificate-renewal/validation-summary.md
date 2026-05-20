# Validation Summary: Automate ArgoCD Certificate Renewal

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- cert-manager
- Kubernetes Ingress
- Kubernetes CronJob
- Kubernetes Secrets and RBAC
- Certbot
- acme.sh
- OpenSSL

## Sources Consulted
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD Ingress configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/ingress/
- cert-manager Certificate resource documentation: https://cert-manager.io/v1.14-docs/usage/certificate/
- cert-manager API reference: https://cert-manager.io/docs/reference/api-docs/
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html
- certbot-dns-route53 documentation: https://certbot-dns-route53.readthedocs.io/
- acme.sh official repository and usage examples: https://github.com/acmesh-official/acme.sh
- Kubernetes kubectl create secret tls reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The cert-manager section showed a Deployment patch using `--tls-cert-file` and `--tls-key-file`. Argo CD's documented mechanism is to use the `argocd-server-tls` Secret automatically, and `argocd-server` hot-reloads changes to that Secret. I replaced the patch with a note that no deployment patch is required.
- The ingress TLS termination example set `server.insecure: "true"` while still routing the ingress backend to HTTPS on port 443. For ingress-nginx TLS termination with insecure Argo CD, the backend should use HTTP and the `argocd-server` HTTP port. I changed the backend protocol to `HTTP` and the backend service port to `80`.
- The Certbot script used `--cert-path`, `--key-path`, and `--fullchain-path` as if they controlled issuance output paths for normal `certonly` issuance. Certbot stores issued certificates under its config directory, so I changed the script to use `--cert-name`, `--config-dir`, `--work-dir`, and `--logs-dir`, then read `fullchain.pem` and `privkey.pem` from the generated `live` directory.
- The acme.sh branch combined issuance with certificate copy flags. acme.sh documents certificate copying as an `--install-cert` step after issuance. I split the command into `--issue` and `--install-cert`, and added `--server letsencrypt` so the command matches the post's Let's Encrypt context.
- The script restarted `argocd-server` to pick up a renewed `argocd-server-tls` Secret. Argo CD documents hot reload for `argocd-server-tls`, so I changed that step to wait for reload instead of restarting the Deployment.
- The internal repo-server TLS Secret did not include `ca.crt`, even though Argo CD requires `ca.crt` in the Secret when the certificate is self-signed. I changed the secret creation to include `tls.crt`, `tls.key`, and `ca.crt`.
- The certificate monitoring CronJob referenced a ServiceAccount but did not create it or grant it access to list/get Secrets. I added a ServiceAccount, Role, and RoleBinding with the minimal namespace-scoped Secret permissions.
- The CronJob used an image focused on kubectl while the script also required `jq`, `openssl`, and GNU-compatible date parsing. I changed the example to an Alpine image that installs the needed packages before running the check and made the shell script POSIX-compatible.

## Review Notes
- For ingress-nginx with TLS termination, Argo CD's official documentation notes that separate HTTP/HTTPS and gRPC ingress objects are needed if full CLI gRPC support is required. The post's single-ingress example is suitable for the UI/API path but may need expansion for production CLI gRPC use.
- The shell snippets were syntax-checked with `bash -n` or `sh -n` after editing. The Kubernetes manifests were reviewed against the current API documentation but not applied to a live cluster.
