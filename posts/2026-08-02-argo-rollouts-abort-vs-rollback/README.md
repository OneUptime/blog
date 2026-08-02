# Argo Rollouts Abort vs. Rollback: What Happens to Pods, Traffic, and Git?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, Rollback, GitOps, Canary Deployment, Blue-Green Deployment

Description: Separate an Argo Rollouts abort from a declarative rollback and understand the resulting pod, traffic, health, desired-state, and Git behavior.

---

An Argo Rollouts **abort** is an immediate live-cluster safety action. A **declarative rollback** changes the desired pod template back to an earlier revision. They are related, but they are not interchangeable.

Confusing the two explains a common incident: users abort a bad canary, see stable pods serving traffic, and assume the rollback is complete. The Rollout remains `Degraded` because its desired template still describes the rejected version, and Git still contains it.

## What Abort Does

During an update, run:

```bash
kubectl argo rollouts abort payments
```

The official command reference says abort stops the current progression, reverts the rollout steps, and makes the previous ReplicaSet active. Operationally, the controller favors the last stable revision:

- managed production traffic is returned to stable;
- blue-green active traffic stays on or returns to the stable ReplicaSet;
- stable capacity is restored as required;
- the new revision is prevented from progressing;
- the Rollout enters an aborted/degraded state.

Scaling is not always instantaneous. Strategy options can preserve the aborted ReplicaSet temporarily or indefinitely. For canaries with traffic routing and for blue-green, `abortScaleDownDelaySeconds` controls delayed scale-down; setting it to `0` disables scale-down. Basic canaries instead roll their replica counts back to stable. With `dynamicStableScale`, stable and canary capacity change as traffic shifts, including during abort. For blue-green, active/preview Services and the abort scale-down delay govern the transition.

Inspect the actual result:

```bash
kubectl argo rollouts get rollout payments
kubectl get service payments-stable -o jsonpath='{.spec.selector}'
kubectl get service payments-canary -o jsonpath='{.spec.selector}'
```

Do not infer traffic solely from pod counts when a traffic router is configured; inspect the managed route as well.

## What Abort Does Not Do

Abort does not change:

- the Rollout's `.spec.template`;
- an image tag or digest in the live desired spec;
- a Helm value, Kustomize overlay, or plain manifest in Git;
- the Argo CD application's target revision;
- application source code.

The controller may be serving stable pods even though the object still desires the failed template. That mismatch is why an aborted Rollout is normally `Degraded`, not `Healthy`.

This behavior is intentional. An emergency traffic decision should not silently rewrite source control or guess how a rendered live object maps back to Helm, Kustomize, or another repository structure.

## What a Rollback Means

A declarative rollback restores an earlier pod template as the desired state. In a GitOps workflow, revert or supersede the bad change in Git:

```bash
git revert <bad-release-commit>
git push
```

Argo CD then syncs the resulting manifest automatically if automated sync is enabled; otherwise, trigger a sync. Without GitOps, apply the previous Rollout manifest or use the plugin's undo operation with care:

```bash
kubectl argo rollouts undo payments --to-revision 12
```

The durable point is that `.spec.template` becomes the version you want the controller to run. Once the desired template matches the stable revision, the Rollout can become healthy rather than merely serving stable traffic while degraded.

Argo Rollouts can fast-track certain returns to a known ReplicaSet. An incomplete update returning to its stable ReplicaSet skips analysis and steps. A configured `rollbackWindow` can also allow recent revisions to bypass the normal progressive sequence. Outside those cases, reapplying an older template may run through the strategy like another template change.

## Compare the State Transitions

| Concern | Abort | Declarative rollback |
| --- | --- | --- |
| Immediate objective | Stop exposure to the current update | Make an older template desired again |
| Traffic | Managed production traffic returned to stable | Follows reconciliation to restored desired revision |
| Stable pods | Scaled up or retained | Become the desired revision's pods |
| Canary/preview pods | Scaled down immediately, after a delay, or retained, depending on strategy and settings | Reconciled according to rollback path |
| `.spec.template` | Still the rejected version | Restored to an earlier version |
| Rollout health | Commonly `Degraded` | Can return to `Healthy` |
| Git | Unchanged | Changed in a GitOps workflow; otherwise not involved |

## A Safe Incident Sequence

For a harmful canary, use two explicit phases:

1. **Containment:** abort and verify that user traffic and required capacity are back on stable.
2. **Reconciliation:** revert the manifest in Git or commit a fixed forward revision, then verify that Argo CD and the Rollout converge.

Example checks:

```bash
kubectl argo rollouts abort payments
kubectl argo rollouts get rollout payments --watch
kubectl get analysisrun -l rollouts-pod-template-hash
```

After the Git change syncs:

```bash
kubectl get rollout payments \
  -o jsonpath='{.status.conditions[?(@.type=="Healthy")].status}'
```

Use your normal application and routing telemetry as the final signal; controller health alone cannot prove the business path works.

## Decide Between Rollback and Roll Forward

Restoring the previous template is appropriate when it remains compatible with current databases, messages, and configuration. A fixed forward revision is safer when the release included irreversible schema changes or when other services already depend on the new contract.

Whichever path you choose, keep image references immutable. Reusing a mutable tag such as `latest` can make an apparent rollback resolve to different content and weakens the audit trail.

Abort buys time by returning managed production traffic to stable. The Git or manifest change completes the desired-state decision.

## Official Documentation

- [Argo Rollouts: Abort Command](https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_abort/)
- [Argo Rollouts: Getting Started — Aborting a Rollout](https://argo-rollouts.readthedocs.io/en/stable/getting-started/)
- [Argo Rollouts FAQ: Rollbacks and Git](https://argo-rollouts.readthedocs.io/en/stable/FAQ/)
- [Argo Rollouts: Rollback Windows](https://argo-rollouts.readthedocs.io/en/stable/features/rollback/)
- [Argo Rollouts: Canary Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Blue-Green Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/bluegreen/)
