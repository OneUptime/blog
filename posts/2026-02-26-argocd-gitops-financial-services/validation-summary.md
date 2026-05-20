# Validation Summary: How to Implement GitOps for Financial Services with ArgoCD

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- AppProject RBAC and sync windows
- Argo CD Notifications
- Kyverno
- External Secrets Operator
- HashiCorp Vault
- Kubernetes NetworkPolicy

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Sync Windows: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Notifications Webhook Service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Notification Subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD Security and Auditing: https://argo-cd.readthedocs.io/en/release-2.7/operator-manual/security/
- Argo CD Command Parameters ConfigMap: https://argo-cd.readthedocs.io/en/release-2.8/operator-manual/argocd-cmd-params-cm-yaml/
- Kyverno Validate Rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- External Secrets Operator API Specification: https://external-secrets.io/main/api/spec/
- Kubernetes NetworkPolicy Documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The weekend deny sync window used `schedule: "0 0 * * 0,6"` with a `48h` duration. This creates a Sunday 48-hour deny window that overlaps Monday business hours. Changed it to run only on Saturday with `schedule: "0 0 * * 6"`.
- The logging ConfigMap used `argocd-cm` for `server.log.level`, but Argo CD server command parameters such as `server.log.level` and `server.log.format` belong in `argocd-cmd-params-cm`. Updated the ConfigMap name and added JSON log formatting.
- The post said ArgoCD provides audit logs by default. Official Argo CD documentation describes Git history as the configuration audit trail and Argo CD Kubernetes Events as complementary application activity records. Reworded this section for accuracy.
- The notification webhook defined a trigger and template but no subscription, so it would not send by default. Added a global `subscriptions` entry for the `audit-log` webhook recipient and changed the trigger condition to fire when an operation state exists.
- The Kyverno examples used the older top-level `spec.validationFailureAction` pattern. Current Kyverno validation examples place `failureAction: Enforce` under each `validate` block. Updated all three Kyverno policies and changed `match.resources` to the current `match.any.resources` form.

## Review Notes
All YAML snippets were parsed successfully after the edits. The compliance discussion remains high-level and should still be adapted to each institution's regulatory scope, evidence requirements, and production approval process.
