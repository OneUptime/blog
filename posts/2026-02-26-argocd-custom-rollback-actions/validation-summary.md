# Validation Summary: How to Create Custom Rollback Actions in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource custom actions
- Argo CD CLI and RBAC
- Kubernetes Deployments and ReplicaSets
- Kubernetes RBAC
- Argo Rollouts
- Lua resource action scripts

## Sources Consulted
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD `argocd app actions list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_list/
- Argo CD `argocd app actions run` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_run/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD built-in Rollout action scripts: https://github.com/argoproj/argo-cd/tree/master/resource_customizations/argoproj.io/Rollout/actions
- Argo CD built-in Deployment restart action script: https://github.com/argoproj/argo-cd/blob/master/resource_customizations/apps/Deployment/actions/restart/action.lua
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Deprecated API Migration Guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/
- Kubernetes `kubectl rollout` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Argo Rollouts CLI documentation: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts/

## Issues Found
- The post claimed it covered StatefulSets, but no StatefulSet rollback implementation was provided. Removed StatefulSets from the description and scope statement.
- The application rollback explanation said Argo CD re-syncs to a previous Git commit. Updated this to say it rolls back to a previous deployed revision from Argo CD history, matching the official CLI documentation.
- The Deployment section suggested using `spec.rollbackTo`, which was removed from the modern `apps/v1` Deployment API. Replaced this with an annotation-driven pattern that delegates the actual rollback to `kubectl rollout undo`.
- The custom Deployment action redefined `restart` and would override built-in Deployment actions. Removed the duplicate restart action and added `mergeBuiltinActions: true` so built-in actions are retained.
- The external rollback controller example lacked the ServiceAccount and RBAC needed to list and patch Deployments and inspect ReplicaSets. Added the required Kubernetes RBAC resources.
- The rollback annotation names were inconsistent between the Argo CD action and the controller. Standardized them on `argocd.argoproj.io/rollback-requested-at` and `argocd.argoproj.io/rollback-revision`.
- The Argo Rollouts section described `undo` as if it were a built-in Argo CD resource action and used annotations/status mutations that do not implement a Rollout undo. Reworked the example to preserve Argo CD's built-in Rollout actions with `mergeBuiltinActions: true` and add a `request-undo` custom action for an external controller to process with `kubectl argo rollouts undo`.
- The CLI examples for Rollout actions omitted `--group argoproj.io`. Added the group flag so the resource can be matched unambiguously.
- The UI and CLI instructions referenced the old `undo` action name. Updated them to use `request-undo`.

## Review Notes
The annotation-based controller examples are intentionally minimal and demonstrate the integration pattern, not a production-grade controller. A production implementation should add safer image pinning, event logging, concurrency handling, validation of requested revisions, and a controller implementation that handles Argo Rollouts undo requests.
