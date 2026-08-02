# Promote, Abort, Retry, or Restart? Argo Rollouts Operations Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, Canary Deployment, Blue-Green Deployment, Operations, Troubleshooting

Description: Choose the correct Argo Rollouts operation by separating step progression, update rejection, aborted-update recovery, and same-revision pod replacement.

---

`promote`, `abort`, `retry`, and `restart` all change a live Argo Rollout, but they solve four different problems. Using the wrong one can skip a safety gate, revive a bad revision, or replace healthy pods without changing the release.

The shortest decision rule is:

- use **promote** when the current update is intentionally paused and approved;
- use **abort** when the current update must stop and stable capacity should take over;
- use **retry** when an aborted Rollout should attempt its unchanged desired revision again;
- use **restart** when the current revision is correct but its pods need to be recreated.

Inspect the Rollout before acting:

```bash
kubectl argo rollouts get rollout payments
```

The output shows the current step, desired and stable images, ReplicaSets, AnalysisRuns, and pause or degraded state. That context is more important than the last application alert.

## Promote: Continue an Approved Update

A normal promotion releases the current pause and lets the Rollout move to its next configured step:

```bash
kubectl argo rollouts promote payments
```

This is appropriate after a manual verification gate, for example when a canary has passed exploratory testing or a blue-green preview has been approved. It does not mean “declare every remaining check successful.”

Full promotion is deliberately stronger:

```bash
kubectl argo rollouts promote payments --full
```

The official command reference states that `--full` skips remaining analysis, pauses, and steps and promotes the desired version fully. Reserve it for an explicit incident or change decision. In automation, make the full form a separately authorized operation rather than an optional flag that can be added casually.

## Abort: Reject the Current Update

Abort stops progression and reverts rollout actions so the previous stable ReplicaSet is active:

```bash
kubectl argo rollouts abort payments
```

For a canary, this means shifting traffic and replicas away from the new revision and back to stable. For blue-green, it keeps or restores the active Service on stable. Exact scaling timing depends on the strategy and fields such as `abortScaleDownDelaySeconds`, `scaleDownDelaySeconds`, and `dynamicStableScale`.

Abort does **not** rewrite `.spec.template`. The desired template still names the rejected version, so the Rollout is normally `Degraded`: stable is serving, but live capacity does not match the desired revision. To finish a rollback declaratively, restore the prior pod template in Git or apply a corrected new revision.

## Retry: Re-attempt an Aborted Revision

Retry is specifically for restarting an aborted Rollout or a failed Experiment:

```bash
kubectl argo rollouts retry rollout payments
```

It is appropriate only after the reason for aborting has been removed without changing the pod template—for example, a repaired metrics endpoint, corrected temporary dependency, or resolved cluster-capacity incident.

Do not use retry to pretend that a bad image changed. If application code, image content, configuration, or pod-template fields must change, publish a new immutable artifact and update `.spec.template`. That creates an auditable new revision and runs the strategy against the thing you actually intend to ship.

## Restart: Replace Pods Without Starting a New Release

Restart recreates the pods belonging to the Rollout while skipping the normal canary or blue-green update sequence:

```bash
kubectl argo rollouts restart payments
```

It is useful when pods need to reload an externally changed Secret, renew connections, or recover from a node/runtime issue while the desired application revision remains correct. A restart can also be scheduled:

```bash
kubectl argo rollouts restart payments --in 10m
```

Under the hood, Argo Rollouts uses `.spec.restartAt` and replaces pods from the existing ReplicaSets. It does not create a new application revision merely by adding a timestamp to the pod template.

This operation has capacity implications. The restart documentation warns that a one-replica Rollout has downtime because the pod must be terminated before replacement. Restarts use `maxUnavailable`; they do not use `maxSurge` to pre-create replacement pods. If `.spec.template` changes during a restart, the restart is canceled and the normal update strategy takes over.

## Compare the Resulting Desired State

| Operation | Primary effect | Changes `.spec.template`? | Normal next action |
| --- | --- | --- | --- |
| `promote` | Releases a rollout pause | No | Observe next step or completion |
| `promote --full` | Skips remaining gates and completes | No | Confirm the desired revision is healthy |
| `abort` | Stops update and returns service to stable | No | Revert Git/template or fix and retry |
| `retry rollout` | Resumes an aborted desired revision | No | Observe all required gates again |
| `restart` | Recreates pods for existing revision(s) | No | Confirm readiness and capacity |

None of these commands updates Git. In a GitOps environment, record the durable desired state in the repository. Treat imperative commands as operational state transitions with audit logs, RBAC, and a documented reconciliation path.

## Build Safer Runbooks

Before exposing these operations to CI or on-call automation:

1. Capture `kubectl argo rollouts get rollout` output and the current image digest.
2. Require a reason and operator identity.
3. Make normal and full promotion separate permissions or workflows.
4. After abort, open or link the Git change that restores stable or advances to a fixed revision.
5. Retry only when the unchanged desired version is now safe.
6. Check replica count and PodDisruptionBudgets before restart.
7. Watch the Rollout until it reaches a terminal or intentionally paused state.

The command name should reflect the intended state transition, not merely the operator's desire to “make the rollout move.”

## Official Documentation

- [Argo Rollouts kubectl Plugin Commands](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts/)
- [Argo Rollouts: Promote](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_promote/)
- [Argo Rollouts: Abort](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_abort/)
- [Argo Rollouts: Retry](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_retry/)
- [Argo Rollouts: Restarting Rollout Pods](https://argo-rollouts.readthedocs.io/en/stable/features/restart/)

