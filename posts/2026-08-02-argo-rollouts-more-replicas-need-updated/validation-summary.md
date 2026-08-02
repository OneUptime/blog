# Validation Summary: Why an Argo Rollout Is Stuck on “More Replicas Need to Be Updated”

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo Rollouts
- Kubernetes Rollout custom resources
- Kubernetes ReplicaSets and Pods
- Argo Rollouts kubectl plugin
- Kubernetes scheduling, readiness probes, and availability
- ResourceQuota, LimitRange, and admission control
- Horizontal Pod Autoscaler (HPA) and KEDA
- Canary traffic routing and dynamic scaling

## Sources Consulted
- [Argo Rollouts controller phase calculation](https://github.com/argoproj/argo-rollouts/blob/master/utils/rollout/rolloututil.go) - authoritative source for the exact conditions that produce the progress message.
- [Argo Rollouts API type definitions](https://github.com/argoproj/argo-rollouts/blob/master/pkg/apis/rollouts/v1alpha1/types.go) - definitions of `replicas`, `updatedReplicas`, `readyReplicas`, and `availableReplicas`.
- [Argo Rollouts Rollout Specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/) - `minReadySeconds`, `progressDeadlineSeconds`, pause behavior, and strategy fields.
- [Argo Rollouts Canary Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/) - replica-weighted canaries, rounding, `setCanaryScale`, `dynamicStableScale`, `maxSurge`, and `maxUnavailable`.
- [Argo Rollouts HPA Support](https://argo-rollouts.readthedocs.io/en/stable/features/hpa-support/) - confirms that an HPA targets the Rollout scale subresource and updates `.spec.replicas`, not the underlying ReplicaSets.
- [Argo Rollouts Architecture](https://argo-rollouts.readthedocs.io/en/stable/architecture/) - confirms that associated ReplicaSets are managed by the Rollouts controller and should not be changed externally.
- [Argo Rollouts kubectl Plugin](https://argo-rollouts.readthedocs.io/en/stable/features/kubectl-plugin/) - plugin command shape and Rollout tree visualization.
- [Kubernetes Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/) and [ServiceAccount administration](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/) - Pod admission failures caused by quotas and nonexistent ServiceAccounts.
- [Kubernetes Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/) and [Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/) - Pod states, probes, events, logs, and troubleshooting behavior.
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) - verification of `--all-containers`, `--previous`, and `--since`.
- [Kubernetes Server-Side Apply field management](https://kubernetes.io/docs/reference/using-api/server-side-apply/#field-management) and [Kubernetes Auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/) - scope of `managedFields` and historical API-write investigation.
- [Argo Rollouts issue #3316](https://github.com/argoproj/argo-rollouts/issues/3316) - authoritative issue record for repeated ReplicaSet update conflicts and the reported stuck state.

## Issues Found
1. **The opening explanation did not state the exact message condition.** The controller/plugin emits “more replicas need to be updated” when `.status.updatedReplicas` is below the desired count in `.spec.replicas`. Updated the opening to state that condition and clarify that it can be expected while an in-progress canary has only partially scaled the new revision.
2. **The introduction conflated updated-replica accounting with readiness and availability.** Pending, crashing, or not-yet-Available new-revision Pods still count as updated once their Pod objects exist. Those states can prevent the controller from advancing later scaling under availability constraints, but they are not themselves excluded from `updatedReplicas`. Reworded the paragraph to distinguish a missing Pod object from a readiness or availability blocker.
3. **The managed-fields guidance overclaimed that it could identify every writer.** Kubernetes `managedFields` records current field managers and ownership, not a complete audit history. Changed the guidance to describe current field managers accurately and point to API audit logs, when enabled, for historical writes.
4. **The conclusion conflated clearing the exact message with completing the Rollout.** The exact message clears when `.status.updatedReplicas` reaches `.spec.replicas`; the Rollout can remain Progressing under a different message while updated pods become available or later strategy work finishes. Corrected the conclusion accordingly.

## Review Notes
- All shell commands and flags are syntactically valid. The standard `kubectl` flags were also checked against local `kubectl` v1.34.1 help; the post does not depend on a deprecated Kubernetes API.
- `kubectl get events --sort-by=.lastTimestamp` remains valid for the core/v1 Event representation, although Event data is best-effort and has limited retention.
- `kubectl logs --previous` only returns logs for a previous terminated container instance when one exists; failure for a container without a prior instance is expected and does not make the command invalid.
- The Argo Rollouts issue cited by the post documents a real ReplicaSet update-conflict scenario, but it is an issue report rather than proof that all occurrences share that cause. The post correctly treats it as an edge case after common workload and reconciliation causes are eliminated.
