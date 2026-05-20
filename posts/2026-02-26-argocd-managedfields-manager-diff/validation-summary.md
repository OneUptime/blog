# Validation Summary: How to Use ManagedFields Manager for Diff Customization in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD diff customization
- Kubernetes managedFields
- Kubernetes Server-Side Apply
- kubectl
- jq
- Argo CD Application and argocd-cm configuration

## Sources Consulted
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/release-2.5/user-guide/diffing/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/release-2.4/user-guide/sync-options/
- Argo CD CLI command reference for `argocd app get`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD CLI command reference for `argocd app diff`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Kubernetes 1.18 Server-Side Apply Beta 2 announcement: https://kubernetes.io/blog/2020/04/01/kubernetes-1.18-feature-server-side-apply-beta-2/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/

## Issues Found
- `kubectl get -o json` examples attempted to inspect `.metadata.managedFields` without `--show-managed-fields`. Kubernetes documentation states that `kubectl get` omits managed fields by default for JSON and YAML output, so all managedFields inspection commands were updated to include `--show-managed-fields`.
- The opening paragraph said Kubernetes 1.18 introduced Server-Side Apply and implied one manager owns each field. Kubernetes documentation and the 1.18 announcement show that SSA was already beta in 1.16, while 1.18 expanded managedFields tracking for new objects. The language was corrected, including the fact that fields can have shared ownership.
- The prerequisites and comparison table said Server-Side Apply is strictly required. Kubernetes field management also records update operations, so this was revised to require useful `managedFields` data while noting that SSA provides the most precise ownership.
- The HPA and VPA Deployment example treated VPA recommender/updater as managers of Deployment container resources. Official VPA documentation describes recommender, updater, and admission-controller behavior; VPA recommendations are not normally written into Deployment specs by the recommender/updater. The example was narrowed to HPA-managed replicas, and VPA manager examples were removed.

## Review Notes
The Argo CD `ignoreDifferences.managedFieldsManagers`, system-level `resource.customizations.ignoreDifferences`, `RespectIgnoreDifferences=true`, and CLI examples are consistent with Argo CD documentation. Manager names for third-party controllers can vary by installation and version, so the post's discovery commands remain important.
