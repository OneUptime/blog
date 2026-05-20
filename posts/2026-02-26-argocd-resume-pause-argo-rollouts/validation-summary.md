# Validation Summary: How to Create Resume and Pause Actions for Argo Rollouts in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD custom resource actions
- Argo CD RBAC
- Argo CD Notifications
- Argo Rollouts
- Kubernetes ConfigMaps
- Lua

## Sources Consulted
- Argo CD Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions/
- Argo CD built-in Resource Actions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/resource_actions_builtin/
- Argo CD `argocd app actions run` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_run/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD upstream Rollout action scripts: https://github.com/argoproj/argo-cd/tree/master/resource_customizations/argoproj.io/Rollout/actions
- Argo CD upstream AnalysisRun terminate action: https://github.com/argoproj/argo-cd/tree/master/resource_customizations/argoproj.io/AnalysisRun/actions
- Argo Rollouts restart documentation: https://argo-rollouts.readthedocs.io/en/stable/features/restart/
- Argo Rollouts specification reference: https://argo-rollouts.readthedocs.io/en/latest/features/specification/
- Argo Rollouts basic usage guide: https://argoproj.github.io/argo-rollouts/getting-started/

## Issues Found
- The introduction implied teams must use the Argo Rollouts kubectl plugin or Rollouts dashboard for lifecycle operations. Updated it to note that current Argo CD releases include built-in Rollout actions and that custom actions are useful for defining or customizing UI behavior.
- The Rollout action example did not include a `pause` action even though the post described pause actions. Added a `pause` action that sets `obj.spec.paused = true`, matching Argo CD's upstream Rollout action behavior.
- The `resume` action only cleared `status.pauseConditions`. Updated it to also clear `spec.paused` when manually paused, matching the upstream Argo CD action.
- The `promote-full` action used a non-authoritative annotation. Updated it to set `obj.status.promoteFull = true`, which is the current upstream Argo CD action behavior for supported Argo Rollouts versions.
- The `retry` action set `status.abort = false` and modified the pod template annotations. Updated it to clear `obj.status.abort`, matching the upstream action.
- The `restart` action used the Kubernetes Deployment restart annotation on the pod template. Updated it to set `spec.restartAt` to an RFC 3339 UTC timestamp, matching Argo Rollouts restart behavior.
- The `argocd app resources` example used unsupported resource filter flags. Updated it to the documented `argocd app resources my-app` form.
- The resource action CLI examples omitted the Rollout API group. Added `--group argoproj.io` to the Rollout action commands for clarity and correctness with CRDs.
- The AnalysisRun terminate discovery logic only exposed the action during `Running`. Updated it to disable termination for already terminated or terminal AnalysisRuns and to set `obj.spec.terminate = true` directly, matching upstream behavior.
- The Rollout health check only treated `status.phase == "Paused"` as suspended. Updated it to also treat `spec.paused` as suspended.

## Review Notes
Argo CD currently provides built-in actions for Argo Rollouts, including `abort`, `pause`, `promote-full`, `restart`, `resume`, `retry`, and `skip-current-step`. Customizing `resource.customizations.actions.argoproj.io_Rollout` can override built-in actions unless `mergeBuiltinActions: true` is used on Argo CD versions that support it.
