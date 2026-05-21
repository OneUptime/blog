# Validation Summary: How to Execute Resource Actions from the ArgoCD UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD resource actions
- Argo CD RBAC
- Kubernetes Deployments, ReplicaSets, Pods, and events
- Argo Rollouts
- kubectl

## Sources Consulted
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Diff Strategies documentation: https://argo-cd.readthedocs.io/en/release-3.3/user-guide/diff-strategies/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Argo Rollouts promote command reference: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_promote/

## Issues Found
- The post described Deployment scaling as separate `scale-up` and `scale-down` actions in the common-action walkthrough. Current Argo CD documentation lists a built-in Deployment `scale` action that accepts a `replicas` parameter, so the walkthrough was updated to select `scale`, enter the desired replica count, and then confirm.
- The troubleshooting section said an empty actions dropdown means no actions are configured in `argocd-cm`. Because Argo CD also ships built-in actions, this was corrected to say no built-in or custom actions are available for the resource type.

## Review Notes
- The `kubectl logs -n argocd deployment/argocd-application-controller --tail=50` command uses valid kubectl syntax for logs from a specified resource with a tail limit.
- Argo CD RBAC controls resource actions through the `applications` resource with action paths such as `action/<group>/<kind>/<action-name>`.
- Argo CD custom action discovery scripts can mark actions disabled via the `disabled` field, matching the post's description of grayed-out UI actions.
