# Validation Summary: Understanding ArgoCD argocd-secret: What Each Key Stores

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets
- Dex and OIDC SSO configuration
- Git provider webhooks
- TLS certificates
- kubectl, jq, OpenSSL, GPG

## Sources Consulted
- Argo CD FAQ, admin password reset: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD user management, Dex and OIDC secret references: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD argocd-secret example manifest: https://github.com/argoproj/argo-cd/blob/master/docs/operator-manual/argocd-secret.yaml
- Argo CD settings/session source for `server.secretkey`: https://github.com/argoproj/argo-cd/blob/master/util/settings/settings.go and https://github.com/argoproj/argo-cd/blob/master/util/session/sessionmanager.go
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes `kubectl create secret tls` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_tls/

## Issues Found
- The post claimed to document every key in `argocd-secret`, but Argo CD can store additional account and custom referenced keys there. Changed the description and introduction to describe common built-in and integration keys.
- The command for listing secret keys used `jsonpath='{.data}' | jq 'keys'`, which does not reliably emit JSON for `jq`. Replaced it with `kubectl get secret ... -o json | jq '.data | keys'`.
- The admin password hash example used `htpasswd`. Argo CD's official documentation recommends `argocd account bcrypt --password`; updated the command accordingly.
- The `server.secretkey` description said it signs and encrypts JWTs, session cookies, and other server-side secrets, and implied every type of session is affected. Argo CD uses it as the HMAC signing key for local JWT session tokens, so the wording and rotation impact were corrected.
- The TLS section implied `tls.crt` and `tls.key` in `argocd-secret` are the normal production path. Argo CD now recommends `argocd-server-tls`; use of `argocd-secret` for server TLS is deprecated. Updated the text to reflect the documented priority and fallback behavior.
- The Bitbucket Cloud webhook key was listed as `webhook.bitbucket.secret`. Argo CD documents and uses `webhook.bitbucket.uuid`; updated the heading, description, and YAML snippet.

## Review Notes
`kubectl` and `argocd` were not installed in the local environment, so those CLI examples were verified against official documentation and Argo CD source rather than executed locally. `jq`, `date`, and `openssl` were available locally and the related shell snippets were sanity checked.
