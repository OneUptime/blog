# Validation Summary: How to Configure Kubernetes Deployments for Zero-Downtime Rolling Updates

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Deployments
- Kubernetes rolling update strategy
- Kubernetes readiness and liveness probes
- Kubernetes container lifecycle hooks
- kubectl rollout commands
- OneUptime monitoring

## Sources Consulted
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes "Update a Deployment Without Downtime" task: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes Liveness, Readiness, and Startup Probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Container Lifecycle Hooks documentation: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kubectl rollout history reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- kubectl rollout pause reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_pause/
- kubectl rollout resume reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_resume/

## Issues Found
- Corrected the graceful shutdown explanation. The post said Kubernetes sends SIGTERM when terminating a pod and then discussed `preStop` hooks, but Kubernetes runs the `preStop` hook before sending the TERM signal, with the termination grace period already counting down. Updated the paragraph and inline YAML comments to reflect the documented ordering.

## Review Notes
The Deployment manifests use the current `apps/v1` API and valid rolling update, selector, probe, lifecycle, and `revisionHistoryLimit` fields. The `kubectl rollout status`, `history`, `undo`, `pause`, and `resume` commands are current. `kubectl` was not installed in the local environment, so CLI command validation was performed against the official generated Kubernetes command reference instead of local `--help` output.
