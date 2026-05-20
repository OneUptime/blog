# Validation Summary: How to Upgrade ArgoCD from 2.8 to 2.9

## Status
validated

## Post Type
Tutorial / upgrade guide

## Technologies Covered
- Argo CD 2.8 and 2.9
- Argo CD Application, AppProject, and ApplicationSet CRDs
- Argo CD Notifications
- Argo CD ApplicationSet
- Kubernetes and kubectl
- Helm and the argo-cd Helm chart
- Kustomize
- GitOps upgrade and rollback workflows

## Sources Consulted
- Argo CD official 2.8 to 2.9 upgrade notes: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/upgrading/2.8-2.9/
- Argo CD official installation docs for release 2.9, including tested Kubernetes versions: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/installation/
- Argo CD official 2.2 to 2.3 upgrade notes for Notifications and ApplicationSet bundling history: https://argo-cd.readthedocs.io/en/release-2.9/operator-manual/upgrading/2.2-2.3/
- Argo CD official diff strategies docs showing Server-Side Diff status since v2.10: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/diff-strategies/
- Argo CD v2.9.0 upstream manifests and CRDs: https://github.com/argoproj/argo-cd/tree/v2.9.0/manifests
- argo-helm argo-cd chart 5.51.0 metadata and values: https://github.com/argoproj/argo-helm/tree/argo-cd-5.51.0/charts/argo-cd

## Issues Found
- The post incorrectly described notifications and ApplicationSet as being newly merged into Argo CD in 2.9. Official upgrade notes show that bundling happened in the 2.2 to 2.3 upgrade path, and both controllers are present in the 2.8 and 2.9 standard manifests. Updated the wording to say they remain bundled and that old standalone installations should only be removed if still carried forward.
- The post incorrectly described Server-Side Diff as an Argo CD 2.9 feature and included a 2.9 configuration section for it. Official diff strategy docs identify Server-Side Diff as beta since v2.10. Replaced that section with a Kustomize rendering review, which is the main 2.8 to 2.9 upgrade note.
- The post claimed `spec.source` is deprecated in favor of `spec.sources`. The Argo CD 2.9 CRD still defines both fields, with `spec.source` valid for single-source applications and `spec.sources` available for multi-source applications. Updated the wording accordingly.
- The post listed Kubernetes 1.25 through 1.29 as supported for Argo CD 2.9. Official release 2.9 installation docs list 1.25 through 1.28 as tested, while chart 5.51.0 declares `kubeVersion: ">=1.23.0-0"`. Updated the compatibility text.
- The post used `kubectl version --short`, which is not reliable across newer kubectl versions. Changed it to `kubectl version`.
- The post used `deploy/argocd-application-controller` for rollout and logs. The upstream 2.9 manifests define `argocd-application-controller` as a StatefulSet, so those commands were changed to `statefulset/argocd-application-controller`.
- The rollback CRD commands omitted the ApplicationSet CRD. Added the v2.8.0 ApplicationSet CRD rollback command.
- The "Common Issues" diff section focused on Server-Side Diff behavior for a 2.9 upgrade. Replaced it with Kustomize rendering change guidance.

## Review Notes
The guide is now technically aligned with the official 2.8 to 2.9 upgrade notes and the argo-cd Helm chart 5.51.0 metadata. Future improvements could pin examples to a specific 2.9 patch version, because the 2.9.16 NetworkPolicy behavior differs from earlier 2.9 releases.
