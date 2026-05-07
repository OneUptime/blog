# Validation Summary: How to Configure ArgoCD Application Sources with IPv6 Git URLs - Repositories

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Git
- Kubernetes
- IPv6
- SSH
- HTTPS/TLS

## Sources Consulted
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD private repositories guide: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD declarative setup guide: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd repo get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_get/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Git `git-clone` documentation, GIT URLS section: https://git-scm.com/docs/git-clone.html
- RFC 3986, URI generic syntax for IPv6 literals in URLs: https://www.rfc-editor.org/rfc/rfc3986.html
- Kubernetes dual-stack networking documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/

## Issues Found
- The post used malformed IPv6 literals such as `[2001:db8::gitea]`. I replaced them with valid documentation IPv6 literals such as `[2001:db8::1]` because IPv6 literals must be hexadecimal addresses, not hostnames.
- The HTTPS "custom CA certificate" example incorrectly used `--tls-client-cert-path`, which Argo CD documents as a client-certificate option, not a CA-trust option. I corrected the example to actual TLS client certificate usage and added the correct guidance to use Argo CD TLS certificate management for self-signed or private CA server certificates.
- The SSH repository example used scp-style syntax with an IPv6 literal. Git documents scp-style and `ssh://` syntax separately, and a literal IPv6 address must be expressed in URL form. I changed the example to `ssh://git@[2001:db8::1]/org/repo.git`.
- The SSH example omitted SSH known-host registration, which Argo CD documents as a required part of secure SSH repository setup. I added `ssh-keyscan ... | argocd cert add-ssh --batch`.
- The verification step used `argocd repo refresh`, which is not the documented repository refresh flow. I replaced it with `argocd repo get ... --refresh hard`, which is the documented CLI option.
- The CLI application creation example did not match the YAML example's automated prune, self-heal, and namespace-creation behavior. I added `--auto-prune`, `--self-heal`, and `--sync-option CreateNamespace=true`.
- The troubleshooting commands used malformed IPv6 hosts and generic `ssh`/`curl` checks. I replaced them with `git ls-remote` from `argocd-repo-server`, which more directly tests the same Git access path Argo CD uses.
- The introduction and conclusion implied that `argocd-server` was the relevant connectivity component and that IPv6 support is automatic in any dual-stack or IPv6-only cluster. I corrected this to point at `argocd-repo-server` and to note that working IPv6 depends on the cluster and CNI being configured for dual-stack or IPv6-only networking.

## Review Notes
- HTTPS access over a literal IPv6 address requires the repository server certificate to be valid for that IP address, typically via an IP subjectAltName. A CA bundle alone does not fix hostname or IP mismatch errors.
- The declarative repository secret example is valid for HTTPS credentials and optional TLS client certificate data in PEM format.
