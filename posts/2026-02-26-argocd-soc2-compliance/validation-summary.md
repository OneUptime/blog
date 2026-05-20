# Validation Summary: How to Configure ArgoCD for SOC2 Compliance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- cert-manager
- Argo CD RBAC and OIDC SSO
- Argo CD Notifications
- Kyverno
- Cosign and Trivy vulnerability attestations
- SOC 2 compliance controls

## Sources Consulted
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/release-2.13/operator-manual/rbac/
- Argo CD OIDC/user management: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD argocd-cm reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD argocd-cmd-params-cm reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD TLS configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/tls/
- Argo CD server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-server/
- Argo CD repo-server command reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/server-commands/argocd-repo-server/
- Argo CD application-controller command reference: https://argo-cd.readthedocs.io/en/release-2.10/operator-manual/server-commands/argocd-application-controller/
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD app history command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_history/
- Kyverno verifyImages documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Trivy Cosign vulnerability attestation documentation: https://www.trivy.dev/docs/latest/guide/supply-chain/attestation/vuln/
- cert-manager Certificate API documentation: https://cert-manager.io/docs/reference/api-docs/

## Issues Found
- The session management snippet used `timeout.session`, which is not an Argo CD setting, and described `timeout.reconciliation` as re-authentication. Replaced it with `users.session.duration`, and removed the misleading reconciliation timeout.
- The Redis TLS snippet used `redis.tls.enabled`, which is not present in the current Argo CD command-params reference. Replaced it with the documented `--redis-use-tls` command flag and noted that it must be applied to components that connect to Redis.
- The production `Application` example only showed `syncPolicy`, omitting required operational context such as `source`, `destination`, and project. Added representative `project`, `source`, and `destination` fields.
- The Kyverno vulnerability attestation example omitted an attestor, so it did not show how Kyverno verifies the signed attestation. Added a Cosign public-key attestor placeholder and changed the Trivy check to match `scanner.uri`, which is the field present in Trivy's Cosign vulnerability record.

## Review Notes
The post is a compliance configuration starting point, not a complete SOC 2 program. Several controls still require organization-specific evidence, auditor scoping, IdP policy, branch protection, log retention, and incident-response procedures outside Argo CD.
