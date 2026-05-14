# Validation Summary: How to Handle Split-Brain Scenarios with Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD Kustomization, GitRepository, ImageRepository, ImageUpdateAutomation, and Alert resources
- Kubernetes CronJob, kubectl, jsonpath, and RBAC-related service account authentication
- Kyverno ClusterPolicy validation rules
- GitOps multi-cluster operations and disaster recovery workflows

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux reconcile source git command reference: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Kyverno validate rule documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno preconditions documentation: https://kyverno.io/docs/policy-types/cluster-policy/preconditions/

## Issues Found
- The Kyverno policy used the deprecated top-level `spec.validationFailureAction` field. Moved the setting to `validate.failureAction`, which is the current documented location for validation rules.
- The Kustomization section described `force: false` as the mechanism that corrects drift. Flux corrects drift during periodic server-side apply reconciliation; `force` is only for recreating resources when immutable field patching fails. Updated the heading and comments.
- The state hash example hashed raw Kubernetes JSON, which includes cluster-specific metadata and could produce false differences. Changed the example to hash a sorted snapshot of selected desired-state fields.
- The cross-cluster detector reused the local pod service account token for both remote Kubernetes API servers. Updated the example to use separate per-cluster bearer tokens from a Secret.
- The Flux Alert example used `notification.toolkit.fluxcd.io/v1`, but Alert and Provider are currently documented under `notification.toolkit.fluxcd.io/v1beta3`. Updated the API version.
- The revision comparison command split Flux revisions on `/`, but Flux Git revisions are reported in the `branch@sha1:<commit>` format. Updated the command to extract the SHA after `@sha1:`.
- The forced reconciliation step annotated `kustomization flux-system` even though the guide’s example Kustomization is named `apps`. Updated it to annotate `kustomization apps`.

## Review Notes
The examples remain illustrative and assume supporting RBAC, Secrets, network routes, and API access are configured. In future revisions, the post could mention Flux CLI commands such as `flux reconcile source git` and `flux reconcile kustomization` as a friendlier alternative to manual annotation.
