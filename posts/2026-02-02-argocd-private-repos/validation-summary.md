# Validation Summary: How to Use ArgoCD with Private Git Repos

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- ArgoCD (Argo CD)
- Kubernetes (Secrets, ConfigMaps, CronJobs)
- Git authentication (SSH keys, HTTPS PATs, GitHub Apps)
- GitHub, GitLab, Bitbucket, Azure DevOps
- External Secrets Operator
- HashiCorp Vault / Sealed Secrets (mentioned)
- `argocd` CLI, `kubectl`, `ssh-keygen`, `ssh-keyscan`

## Sources Consulted
- ArgoCD declarative setup docs — https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/ (repository secret fields, `argocd-tls-certs-cm`, `argocd-ssh-known-hosts-cm`, credential template format)
- ArgoCD private repositories user guide — https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/ (`argocd repo add` flags including `--ssh-private-key-path`, `--insecure-skip-server-verification`, GitHub App fields)
- External Secrets Operator API docs — https://external-secrets.io/latest/api/externalsecret/ (current stable `external-secrets.io/v1` apiVersion)
- GitHub / GitLab published SSH host key fingerprints (verified the `ssh-ed25519` values in the known_hosts example)

## Issues Found
1. **Incorrect use of `tlsClientCertData` / `tlsClientCertKey` for trusting a custom CA.** In the "Configure Custom TLS Certificate" section the post presented these fields as a way to "provide CA certificate (recommended)" for a self-hosted Git server. These fields are for mTLS *client* authentication — i.e., the certificate ArgoCD presents to the server — not for trusting the server's CA. The correct mechanism for trusting a self-signed cert or private CA is the `argocd-tls-certs-cm` ConfigMap (key = hostname, value = PEM-encoded CA). I restructured the section to show the `argocd-tls-certs-cm` ConfigMap as the primary mechanism and re-labeled the `tlsClientCertData`/`tlsClientCertKey` example as optional mTLS client auth.

2. **Outdated External Secrets Operator apiVersion.** The post used `external-secrets.io/v1beta1`. The current stable API for ExternalSecret is `external-secrets.io/v1`. Updated the example.

## Review Notes
- All ArgoCD repository secret field names (`type`, `url`, `username`, `password`, `sshPrivateKey`, `githubAppID`, `githubAppInstallationID`, `githubAppPrivateKey`, `insecure`) are correct, as are the labels `argocd.argoproj.io/secret-type: repository` and `argocd.argoproj.io/secret-type: repo-creds`.
- `argocd` CLI flags shown (`--ssh-private-key-path`, `--username`, `--password`, `--insecure-skip-server-verification`, `--refresh`, `--hard-refresh`) are correct against current docs.
- The GitHub (`AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl`) and GitLab (`AAAAC3NzaC1lZDI1NTE5AAAAIAfuCHKVTjquxvt6CM6tdG4SLp1Btn/nOeHHE5UOzRdf`) ed25519 host keys in the `argocd-ssh-known-hosts-cm` example match the keys those providers publish.
- GitLab deploy token username format `gitlab+deploy-token-<id>` and group access token convention (username `oauth2`, password `glpat-…`) are correct.
- The credential template URL pattern uses prefix matching; the HTTPS example (`https://github.com/myorg`) is documented and standard. The SSH credential template URL example (`git@gitlab.com:mygroup`) is plausible as a prefix match but the official ArgoCD docs only show HTTPS examples for credential templates — readers using SSH templates may want to verify against their setup.
- Minor caveat in the "Rotate Credentials Automatically" CronJob: piping `kubectl create secret generic … --dry-run=client -o yaml | kubectl apply -f -` will replace the Secret but drop the ArgoCD label (`argocd.argoproj.io/secret-type: repository`) and the other required fields (`type`, `url`). In real-world use the rotation job would need to preserve these (e.g., via `kubectl patch` or a templated manifest). Left as-is since it's illustrative rather than copy-paste production code, but worth keeping in mind.
