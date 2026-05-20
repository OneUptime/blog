# Validation Summary: How to Prevent Unauthorized Configuration Changes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD AppProjects
- Argo CD RBAC
- Argo CD sync windows and automated sync
- Argo CD notifications
- GitHub branch protection and CODEOWNERS
- GitHub CLI
- Kubernetes RBAC
- Kyverno admission policies

## Sources Consulted
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD GnuPG verification: https://argo-cd.readthedocs.io/en/stable/user-guide/gpg-verification/
- Argo CD Notifications Triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications Templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Kyverno ValidatingPolicy documentation: https://kyverno.io/docs/policy-types/validating-policy/
- Kyverno validate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- GitHub REST API branch protection documentation: https://docs.github.com/en/rest/branches/branch-protection
- GitHub CLI `gh api --help` output from the local CLI
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The GitHub branch protection `gh api` example sent `required_pull_request_reviews` as a string field and omitted required API fields. Changed it to send a complete JSON request body with `required_status_checks`, `enforce_admins`, `required_pull_request_reviews`, `restrictions`, and `allow_force_pushes`.
- The sync window example claimed to allow manual emergency syncs with a separate allow window, but Argo CD deny windows override allow windows. Changed the weekend deny window to set `manualSync: true` and updated the comment accordingly.
- The "full manual control" Application example set `selfHeal: false` and `prune: false` under `automated`, which still enables automated sync when `enabled` is unset. Added `enabled: false`.
- The Kyverno examples used deprecated `spec.validationFailureAction` and legacy `ClusterPolicy` validate patterns. Updated them to current Kyverno `policies.kyverno.io/v1` `ValidatingPolicy` examples using `validationActions`, `matchConstraints`, and CEL validations.

## Review Notes
- The Argo CD `signatureKeys` AppProject example is still documented in the stable GnuPG verification guide. Argo CD's latest source integrity documentation also describes newer `sourceIntegrity` configuration, so future updates could mention that newer approach if the blog targets the latest Argo CD features specifically.
- The corrected Kyverno examples target Kyverno v1.18-style `ValidatingPolicy`; older Kyverno installations may still use `ClusterPolicy`.
