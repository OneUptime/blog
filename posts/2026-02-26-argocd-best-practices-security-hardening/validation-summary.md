# Validation Summary: ArgoCD Best Practices for Security Hardening

## Status
validated

## Post Type
Security hardening guide

## Technologies Covered
- Argo CD
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes Pod Security Standards
- cert-manager
- External Secrets Operator
- GitHub App repository credentials
- Trivy

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD TLS Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD command parameters ConfigMap: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD Security Overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/security/
- Argo CD Private Repositories: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD account password command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account_update-password/
- Argo CD cluster management and cluster RBAC docs: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Security Standards namespace labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/

## Issues Found
- The developer RBAC role granted `applications, action/*`, which allows Argo CD resource actions and did not match the "read and sync only" description. Removed that permission.
- The default-deny NetworkPolicy also denied egress, but the comment only mentioned ingress and the examples did not allow required egress for repo-server Git access, API-server OIDC access, or internal component communication. Updated the comment and added targeted egress policies.
- The TLS configuration used invalid Argo CD command parameter names: `redis.tls.enabled` and `reposerver.tls.enabled`. Replaced them with documented repo-server TLS and strict certificate validation parameters.
- Strict repo-server TLS validation requires a persistent repo-server certificate with service DNS SANs. Added a cert-manager `Certificate` example for `argocd-repo-server-tls`.
- The audit logging section used `server.audit.enabled`, which is not a documented Argo CD setting. Replaced it with Argo CD's documented Kubernetes Events approach and a command to inspect application events.

## Review Notes
The post is now technically consistent with current Argo CD and Kubernetes documentation. Some examples remain intentionally generic, such as allowing outbound `0.0.0.0/0` for managed Kubernetes APIs, Git hosts, and OIDC providers; production installs should narrow those ranges where possible.
