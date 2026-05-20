# Validation Summary: How to Handle CRD and CR Ordering with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- CustomResourceDefinitions
- Custom resources
- Argo CD sync waves, sync phases, resource hooks, and sync options
- Argo CD App of Apps and ApplicationSet
- cert-manager

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/release-2.5/user-guide/sync-options/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Application health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD ApplicationSet Progressive Syncs: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Progressive-Syncs/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_app_get/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- cert-manager installation documentation: https://cert-manager.io/docs/installation/

## Issues Found
- The cert-manager sync-wave example defined the `Certificate` CRD but later created a `ClusterIssuer` custom resource. Updated the CRD snippet to define `clusterissuers.cert-manager.io` with `kind: ClusterIssuer` and cluster scope so the CRD and CR match.
- The resource hook section showed a CRD with `hook-delete-policy: HookSucceeded` and then suggested hooks without a delete policy for CRDs. Argo CD deletes successful hooks with `HookSucceeded`, and defaults to `BeforeHookCreation` when no hook delete policy is specified. Replaced that guidance with a warning to manage persistent CRDs as regular resources or separate Applications.
- The wait Job used the same sync wave as the operator in the surrounding ordering pattern. Updated the Job wave to run after the operator wave.
- The CRD Application example combined `Replace=true` and `ServerSideApply=true`, but Argo CD documents that `Replace=true` takes precedence over `ServerSideApply=true`. Removed `Replace=true` from the CRD Application example.
- The App of Apps/ApplicationSet ordering statement was too broad. Added the Argo CD `Application` health-check caveat for App of Apps and pointed ApplicationSet ordering to Progressive Syncs.
- The `SkipDryRunOnMissingResource` section implied the option is generally required for CRDs in the same sync. Argo CD automatically skips dry-run when the CRD is part of the same sync, so the text now scopes the option to resources whose CRD is created outside the same sync.
- The CRD update section recommended `Replace=true` as the main fix while the summary recommended server-side apply. Updated the section to use `ServerSideApply=true` for the annotation-size case and documented `Replace=true` as a more disruptive alternative.

## Review Notes
The examples are illustrative and do not include a complete production cert-manager installation. In particular, the Deployment snippet is intentionally minimal and omits the additional components, RBAC, arguments, and webhooks included in the official cert-manager manifests.
