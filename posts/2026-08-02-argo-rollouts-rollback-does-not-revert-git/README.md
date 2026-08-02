# Why an Argo Rollouts Rollback Does Not Revert Your Git Commit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Argo CD, GitOps, Rollback, Kubernetes, Continuous Delivery

Description: Understand the boundary between Argo Rollouts live-cluster recovery and Git desired state, then build a rollback workflow that converges both safely.

---

Argo Rollouts does not clone your repository, interpret Helm or Kustomize sources, or push commits. It watches Kubernetes resources. When a rollout fails and falls back to stable, the controller changes live ReplicaSets and traffic, but it does not revert the Git commit that introduced the new pod template.

This is not a missing integration. It is a deliberate ownership boundary between progressive delivery and source-of-truth management.

## The Two Controllers See Different Worlds

Suppose Git changes the image from `payments:1.8.0` to `payments:1.9.0`:

1. Argo CD renders the commit and applies a `Rollout` whose `.spec.template` requests `1.9.0`.
2. Argo Rollouts sees that live template change and creates a canary ReplicaSet.
3. Analysis fails or an operator aborts.
4. Argo Rollouts returns traffic and capacity to the stable `1.8.0` ReplicaSet.
5. The live Rollout object still requests `1.9.0`; Git also still requests `1.9.0`.

The controller reports the Rollout as degraded because the desired revision is not serving. Argo CD can still consider the resource spec synchronized: the live `.spec.template` and the rendered Git manifest both say `1.9.0`. ReplicaSet scaling, status, and managed routing are controller-owned operational state, not proof that the desired template changed.

The Argo Rollouts FAQ describes this exact sequence and states that Rollouts does not read or write Git.

## Why the Controller Cannot Safely Revert Git

The live object does not contain enough information to make a correct source edit. The desired image might originate from:

- a Helm values file shared across environments;
- a Kustomize base plus several overlays;
- an ApplicationSet parameter;
- an image-automation commit;
- a generated manifest stored nowhere in its rendered form;
- multiple repositories or Argo CD sources.

Even if a controller could find a repository, it would still need a branch policy, signing identity, conflict strategy, review rules, and a decision between reverting and rolling forward. Giving a cluster controller write access to production Git also expands the security impact of a compromised controller.

Argo Rollouts therefore makes the immediate live traffic decision and leaves repository mutation to the delivery workflow that owns Git.

## Finish the Recovery Explicitly

After containment, choose one durable outcome.

### Revert to the Previous Manifest

Revert the release commit or change the image back to its previous immutable tag or digest:

```bash
git revert <release-commit>
git push
```

When Argo CD syncs the restored template, Argo Rollouts can recognize a return to stable during an incomplete update and fast-track it. A configured `rollbackWindow` can extend fast rollback behavior to a defined number of recent revisions.

### Roll Forward to a Fixed Revision

If rollback is unsafe because of data or API changes, publish a corrected image and commit it:

```yaml
containers:
  - name: payments
    image: registry.example.com/payments@sha256:<fixed-digest>
```

This creates a new pod template and a new progressive update. It preserves the failed attempt in history and avoids pretending that an old binary is compatible with irreversible changes.

## Do Not Fight Argo CD with Live Patches

An operator can patch the live Rollout back to the stable image, but that creates drift from Git. With automatic self-healing, Argo CD is explicitly configured to reapply Git when live state differs. Even without self-heal, another Git change or manual sync can restore the failed desired template.

If Git is the source of truth, make the durable change there. Use live commands for immediate containment only, and record a clear handoff from the incident action to the repository change.

Argo CD's own application rollback is a separate feature: it points the application at previously deployed Git content. The Argo Rollouts FAQ notes that an Argo CD rollback and an Argo Rollouts rollback are unrelated. Argo CD also documents that application rollback is unavailable while automated sync is enabled, so many teams implement rollback as a normal Git revert instead.

## A Convergent GitOps Runbook

Use a workflow with observable checkpoints:

1. Abort the harmful update if traffic is still exposed.
2. Confirm stable traffic, capacity, and application health.
3. Capture the failed image digest, AnalysisRun, and rollout revision.
4. Decide whether compatibility permits a revert or requires a roll-forward.
5. Open the repository change using normal review and signing controls.
6. Merge and let Argo CD sync it.
7. Watch both Argo CD sync/health and `kubectl argo rollouts get rollout --watch`.
8. Close the incident only when live behavior and declared desired state agree.

For automation, a notification can create a revert pull request or issue, but avoid allowing an AnalysisRun failure to push directly to a protected branch without policy. The external automation owns the source edit; Argo Rollouts still does not.

## Preserve a Useful Audit Trail

Record these identifiers together:

- Git commit and Argo CD application revision;
- Rollout revision and ReplicaSet hash;
- container image digest, not only its tag;
- AnalysisRun name and failed measurement;
- aborting operator or automated policy;
- revert or fix commit that restored convergence.

That chain explains both what users ran during the incident and what the repository declared afterward. A live fallback protects availability; the Git change restores a coherent source of truth.

## Official Documentation

- [Argo Rollouts FAQ: Rollbacks and Git](https://argo-rollouts.readthedocs.io/en/stable/FAQ/)
- [Argo Rollouts: Getting Started — Aborting and Reverting](https://argo-rollouts.readthedocs.io/en/stable/getting-started/)
- [Argo Rollouts: Rollback Windows](https://argo-rollouts.readthedocs.io/en/stable/features/rollback/)
- [Argo CD: Automated Sync Policy](https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/)
- [Argo CD: Automation from CI Pipelines](https://argo-cd.readthedocs.io/en/stable/user-guide/ci_automation/)
