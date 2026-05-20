# Validation Summary: Understanding Sync Status in ArgoCD: Synced vs OutOfSync

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Helm
- Kustomize
- Argo CD CLI
- Argo CD Application manifests

## Sources Consulted
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD getting started documentation: https://argo-cd.readthedocs.io/en/latest/getting_started/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/diffing/
- Argo CD compare options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/compare-options/
- Argo CD orphaned resources monitoring documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/orphaned-resources/
- Argo CD app diff command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD app get command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Kubernetes image pull policy documentation: https://kubernetes.io/docs/concepts/containers/images/

## Issues Found
- The post described extra resources as "orphans" and implied any orphaned resource would make an Application OutOfSync. Updated the wording to distinguish Argo CD-tracked resources that need pruning from unrelated orphaned namespace resources, which are handled by orphaned resources monitoring.
- The definition of Synced implied all resources that should not exist are removed whenever pruning is enabled. Clarified that this applies to Argo CD-tracked prunable resources.
- The comparison section stated that Argo CD generally treats omitted Kubernetes defaults as equivalent, using `imagePullPolicy` as an example. Replaced this with a more accurate statement about normalization of Kubernetes-managed fields and known type formatting, while noting that explicit manifests or ignore rules may still be needed.
- The comparison section said any differing field makes an Application OutOfSync. Clarified that ignored and non-relevant fields are excluded from sync status.
- The automated sync example was a partial Application manifest without noting omitted required fields. Added a comment that `project`, `source`, and `destination` are omitted for brevity.
- The self-heal description said Argo CD reverts any manual cluster changes within seconds and always keeps the cluster matching Git. Softened this to match Argo CD's documented self-heal behavior and default 5-second self-heal timeout.

## Review Notes
The Argo CD CLI was not installed in the local environment, so CLI flags were verified against the official Argo CD command reference. The two internal OneUptime links referenced by the post returned HTTP 200 responses.
