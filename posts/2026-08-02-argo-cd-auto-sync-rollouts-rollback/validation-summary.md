# Validation Summary: Argo CD Auto-Sync and Argo Rollouts Rollbacks: Avoiding Surprising Reconciliation

## Status
validated

## Post Type
Technical guide / Operations runbook

## Technologies Covered
- Argo CD
- Argo Rollouts
- Argo CD ApplicationSet
- Kubernetes Rollouts, ReplicaSets, Services, and managed fields
- Istio VirtualService traffic routing
- NGINX Ingress and AWS ALB traffic routing
- Git and GitOps rollback workflows
- Helm chart rendering and container image digests
- Argo CD and Argo Rollouts CLI commands

## Sources Consulted
- Argo Rollouts FAQ: https://argo-rollouts.readthedocs.io/en/stable/FAQ/
- Argo Rollouts basic usage and abort behavior: https://argo-rollouts.readthedocs.io/en/stable/getting-started/
- Argo Rollouts rollback windows: https://argo-rollouts.readthedocs.io/en/stable/features/rollback/
- Argo Rollouts Istio traffic management and GitOps integration: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/
- Argo Rollouts NGINX traffic management: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/
- Argo Rollouts AWS ALB traffic management: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/alb/
- Argo Rollouts CLI overview: https://argo-rollouts.readthedocs.io/en/latest/generated/kubectl-argo-rollouts/kubectl-argo-rollouts/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD diff customization: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD ApplicationSet resource modification controls: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Controlling-Resource-Modification/
- Argo CD declarative Application setup: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD CLI command references for `app get` and `app diff`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/ and https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Kubernetes container image documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Git `revert` documentation: https://git-scm.com/docs/git-revert.html

## Issues Found
- The Istio YAML was described as an Application configuration even though it intentionally omits the required source and destination fields. Clarified that it is an excerpt from an existing Application configuration so readers do not mistake it for a complete, directly applicable manifest.
- The rollback note referred to a "rendered image digest" for mutable chart inputs. Helm normally renders the tag supplied to the chart; the container runtime resolves that tag to an image digest. Changed the wording to recommend recording the digest actually resolved at deployment time and clarified that the chart still renders a mutable tag.

## Review Notes
- The failed-release explanation correctly distinguishes Argo CD synchronization status from health status: the Rollout can remain Synced while being Degraded after traffic returns to the stable revision.
- The `set image`, `get rollout`, `argocd app get`, `argocd app diff`, and `kubectl get --show-managed-fields` command forms are current and valid.
- The `ignoreDifferences`, `jqPathExpressions`, `syncPolicy.automated.enabled`, `selfHeal`, `ApplyOutOfSyncOnly`, and `RespectIgnoreDifferences` fields are current. As the post states, `RespectIgnoreDifferences` affects synchronization only after the target resource already exists.
- The guidance for ApplicationSet-managed Applications is accurate: directly changing a generated Application's auto-sync field is not durable unless the ApplicationSet configuration permits that difference.
- The post does not pin Argo CD or Argo Rollouts versions. Its claims and examples match the stable documentation reviewed on 2026-08-02; operators should still consult the integration guide corresponding to their installed release.
