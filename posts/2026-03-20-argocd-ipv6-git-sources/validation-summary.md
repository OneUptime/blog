# Validation Summary: How to Configure ArgoCD Application Sources with IPv6 Git URLs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Git
- IPv6
- Kubernetes
- HTTPS / TLS
- SSH

## Sources Consulted
- Argo CD private repositories: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd cert add-ssh` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cert_add-ssh/
- Git URL syntax (`git clone` documentation): https://git-scm.com/docs/git-clone
- RFC 3986 URI generic syntax: https://datatracker.ietf.org/doc/html/rfc3986
- OpenSSH `ssh-keyscan(1)`: https://man.openbsd.org/ssh-keyscan.1
- OpenSSH `sftp(1)`: https://man.openbsd.org/sftp
- OpenSSL `openssl-s_client`: https://docs.openssl.org/3.0/man1/openssl-s_client/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/

## Issues Found
- The post used `2001:db8::git` as a literal IPv6 address. I replaced it with `2001:db8::1` because the original value was not valid IPv6 syntax.
- The HTTPS example used `--tls-client-cert-path /tmp/git-ca.crt` as if it configured server CA trust. I replaced that with `argocd cert add-tls gitea.example.com --from /tmp/git-ca.crt` because Argo CD uses `argocd cert add-tls` or `argocd-tls-certs-cm` for custom HTTPS trust, while `--tls-client-cert-path` is for client certificates.
- The repository Secret example stored a CA certificate in `tlsClientCertData`. I removed that and clarified that custom CA trust is configured separately, because `tlsClientCertData` and `tlsClientCertKey` are client-auth fields rather than server trust configuration.
- The SSH section incorrectly said bracket notation is not standard for SSH URLs. I corrected the wording and added a valid literal IPv6 `ssh://` example, since bracketed IPv6 literals are the correct URI form when SSH URLs use an IPv6 address.
- The `argocd cert add-ssh` example was invalid. I changed it to `ssh-keyscan -6 ... | argocd cert add-ssh --batch` because `argocd cert add-ssh` reads `known_hosts` data from stdin or `--from` and does not take the host as a positional argument.
- The post used `argocd-cmd-params-cm` and `server.listen` as if they controlled outbound Git IPv6 behavior. I removed that example because it changes the API server listen address, not Argo CD's outbound repository connection behavior.
- The custom TLS trust example used the wrong ConfigMap and wrong key structure. I replaced it with `argocd-tls-certs-cm` keyed by hostname, which is the documented Argo CD mechanism for HTTPS repository trust.
- I simplified the connectivity checks to use `git ls-remote` from `argocd-repo-server`, which validates the actual Git access path instead of unrelated server listen settings.

## Review Notes
- When using a literal IPv6 HTTPS repository URL, the server certificate must include that IPv6 address in the certificate SAN as an IP address.
- For self-signed or custom-CA HTTPS repositories, hostname-based URLs that resolve to AAAA records are easier to manage because Argo CD stores repository TLS trust per server name in `argocd-tls-certs-cm`.
- Argo CD 2.4 and later use newer OpenSSH behavior; SSH servers that only support the legacy `ssh-rsa` SHA-1 signature algorithm can require server-side updates before they work cleanly.
