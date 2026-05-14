# Validation Summary: How to Configure Flux Kustomization with Read-Only Service Account

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Flux notification-controller Alerts and Providers
- Kubernetes ServiceAccounts
- Kubernetes RBAC Roles and RoleBindings
- kubectl authorization checks

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Kubernetes API dry-run documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- kubectl `auth can-i` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The post incorrectly described a read-only Flux Kustomization as a successful dry-run validation and drift-detection workflow. Kubernetes dry-run authorization is identical to non-dry-run authorization, and Flux Kustomizations validate and apply resources, so a service account with only `get`, `list`, and `watch` permissions will fail on create/patch/update/delete attempts. Updated the explanation, use cases, alerting language, and best practices to describe this as an RBAC boundary check that fails closed.
- The service accounts were created in the `production` namespace while the Flux Kustomizations were in `flux-system`. Updated the manifests so service accounts live in `flux-system` and are bound by RoleBindings in the `production` namespace.
- The writable Kustomization depended on the read-only Kustomization, but a correctly restricted read-only Kustomization should not become Ready when write permissions are required. Removed the `dependsOn` example and updated the best practice guidance.
- The verification commands impersonated `system:serviceaccount:production:flux-readonly`, which no longer matched the corrected service account namespace. Updated them to impersonate `system:serviceaccount:flux-system:flux-readonly` and added a `patch deployments` check because server-side apply dry-run requires write authorization such as `patch`.
- The Flux status command used `flux get kustomization`; the official command is `flux get kustomizations`. Updated the command.

## Review Notes
The corrected pattern is useful for proving that Flux cannot write with a restricted service account, but it should not be presented as a full validation-only deployment gate. A future post could cover CI-based manifest validation with `kustomize build` and `kubectl apply --server-side --dry-run=server`, noting that server-side dry-run still requires write authorization.
