# Validation Summary: How to Secure the GitOps Pipeline with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- AppProject security boundaries
- GnuPG commit signature verification
- OIDC SSO and RBAC
- External Secrets Operator
- Sealed Secrets
- Argo CD Vault Plugin
- Kubernetes NetworkPolicy
- Kyverno

## Sources Consulted
- Argo CD Git GnuPG signature verification: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity-git-gpg/
- Argo CD Source Integrity Verification: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity/
- Argo CD declarative setup for repositories and AppProjects: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD user management, OIDC, and admin account configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD TLS configuration and command parameters: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/ and https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD security, auditing, and logging: https://argo-cd.readthedocs.io/en/stable/operator-manual/security/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- Argo CD Vault Plugin configuration: https://argocd-vault-plugin.readthedocs.io/en/stable/config/
- Kyverno validate rules and restrict image registries policy: https://kyverno.io/docs/policy-types/cluster-policy/validate/ and https://kyverno.io/policies/best-practices/restrict-image-registries/restrict-image-registries/

## Issues Found
- The GPG section used a non-existent `gpg.verification.enabled` key in `argocd-cm`. Replaced it with the supported `argocd-gpg-keys-cm` public key configuration and noted that enforcement happens at the AppProject level.
- The AppProject GPG example used legacy `signatureKeys`. Updated it to the current `spec.sourceIntegrity.git.policies` format.
- The SSH repository secret paired `sshPrivateKey` with an HTTPS repository URL. Changed the URL to the SSH form `git@github.com:org/config-repo.git`.
- The TLS example used invalid `reposerver.tls.enabled` and `redis.tls.enabled` parameters. Replaced them with documented repo-server TLS and plaintext/strict TLS command parameter keys.
- The audit section used a non-existent `server.audit.enabled` setting. Replaced it with Argo CD application event inspection, which matches the documented auditing model.
- The Kyverno policy used the deprecated top-level `validationFailureAction` field and lower-case `enforce`. Moved the action to `validate.failureAction: Enforce` and added init and ephemeral container coverage following the current policy pattern.

## Review Notes
- Argo CD source integrity verification is a recent replacement for legacy project-wide `signatureKeys`; older Argo CD installations may still use `signatureKeys`, but current documentation recommends `sourceIntegrity`.
- The examples remain illustrative and use placeholder key IDs, repository URLs, and secret material that must be replaced in a real deployment.
