# Validation Summary: Can Argo Rollouts Manage StatefulSets? Safer Patterns for Stateful Canary Releases

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo Rollouts
- Kubernetes `StatefulSet`, `ReplicaSet`, and `Deployment` workloads
- Kubernetes partitioned rolling updates and `OnDelete` updates
- `kubectl`
- PersistentVolumeClaims and volume access modes
- Headless Services and stable StatefulSet identity
- Database and stateful operators
- Canary and blue-green delivery patterns
- Expand/contract database migrations

## Sources Consulted
- Argo Rollouts overview and controller behavior — https://argo-rollouts.readthedocs.io/en/stable/
- Argo Rollouts architecture — https://argo-rollouts.readthedocs.io/en/stable/architecture/
- Argo Rollouts analysis and progressive delivery — https://argo-rollouts.readthedocs.io/en/stable/features/analysis/
- Argo Rollouts specification — https://argo-rollouts.readthedocs.io/en/stable/features/specification/
- Kubernetes StatefulSets concepts — https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference — https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes StatefulSet basics and partitioned updates tutorial — https://kubernetes.io/docs/tutorials/stateful-application/basic-stateful-set/
- Kubernetes `kubectl rollout status` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes `kubectl rollout status` implementation for StatefulSets — https://github.com/kubernetes/kubectl/blob/master/pkg/polymorphichelpers/rollout_status.go
- Kubernetes `kubectl patch`, `get`, and `logs` references — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes Persistent Volumes and access modes — https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes `ReadWriteOncePod` guidance — https://kubernetes.io/docs/tasks/administer-cluster/change-pv-access-mode-readwriteoncepod/

## Issues Found
1. **The rolling-update ordering statement omitted `maxUnavailable`**: The post attributed one-Pod-at-a-time progression to the default `OrderedReady` policy alone. Current Kubernetes supports `.spec.updateStrategy.rollingUpdate.maxUnavailable`; values greater than 1 can update StatefulSet Pods in batches. Qualified the statement with the default `maxUnavailable: 1`, which matches the workflow shown in the post.

## Review Notes
- The StatefulSet YAML is intentionally partial and clearly marks the required selector and Pod template, plus optional volume claim templates, as omitted; it is suitable as a focused configuration excerpt rather than a standalone manifest.
- Current `kubectl rollout status` explicitly accounts for a StatefulSet partition by waiting for `replicas - partition` updated Pods, so the validation command works for the staged canary described.
- `ReadWriteOnce` restricts a volume to one node, not necessarily one Pod. The post correctly treats sharing one such PVC between independent database Pods as unsafe rather than claiming Kubernetes always prevents it. `ReadWriteOncePod` is the access mode for strict single-Pod attachment when supported.
- No specific Kubernetes or Argo Rollouts version is pinned. The APIs and commands used are current and non-deprecated in the documentation reviewed.
