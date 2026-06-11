# Validation Summary: How to Implement Kubernetes Rolling Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes rolling update strategy
- Pod readiness probes and readiness gates
- kubectl rollout commands
- Kubernetes Deployment manifests

## Sources Consulted
- Kubernetes Deployment concepts documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes API reference for apps/v1 Deployment: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes guide, Update a Deployment Without Downtime: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes Pod Conditions documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-condition/
- kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- kubectl rollout history reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_history/
- kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- kubectl rollout pause reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_pause/

## Issues Found
- The readiness gates Deployment manifest omitted the required `.spec.selector` and matching `.spec.template.metadata.labels`. Added both so the `apps/v1` Deployment manifest is valid.
- The readiness gates explanation implied external systems verify status directly. Updated it to state that an external controller must set custom Pod conditions, which is how readiness gates are evaluated.
- The readiness probe explanation did not mention that readiness gates must also be `True` before the Pod is ready. Updated the text to include both readiness probe and readiness gate behavior.
- The change-cause guidance showed annotating after `kubectl apply`, but Kubernetes rollout history records the `kubernetes.io/change-cause` annotation value at the time of each revision. Updated the guidance to set the annotation before applying the update.

## Review Notes
- The article correctly describes `RollingUpdate` as the default Deployment strategy, and correctly describes `maxSurge`, `maxUnavailable`, percentage rounding behavior for the 4-replica example, `minReadySeconds`, `revisionHistoryLimit`, and the listed `kubectl rollout` commands.
- Kubernetes retains 10 old ReplicaSets by default for Deployment rollback history; setting `revisionHistoryLimit` to `0` disables rollback. The article's recommendation to retain history is technically sound.
