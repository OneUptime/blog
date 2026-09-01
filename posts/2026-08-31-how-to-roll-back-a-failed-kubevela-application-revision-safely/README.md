# How to Roll Back a Failed KubeVela Application Revision Safely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Application Delivery, Continuous Delivery, Troubleshooting

Description: Inspect KubeVela Application revisions, stop a failing workflow, restore the latest successful state for a publish-version-controlled Application, and prevent GitOps from reapplying the bad release.

---

KubeVela rollback operates on an `ApplicationRevision`, not only on a single Deployment. A revision can snapshot the Application and runtime dependencies such as definitions and external policies. For an Application controlled by `app.oam.dev/publishVersion`, the documented workflow rollback restores the latest **succeeded** Application revision. That is safer than running `kubectl rollout undo` on one Deployment, because KubeVela would still hold the failed desired state and could reconcile the Deployment forward again.

Rollback is not automatically safe for databases, one-way migrations, external APIs, or cloud resources. Stabilize traffic, preserve evidence, and understand side effects before changing desired state.

## Identify the failing release

```bash
vela status podinfo --namespace examples --tree --detail
vela revision list podinfo --namespace examples
kubectl get application podinfo --namespace examples -o yaml
```

Record:

- publish version, generation, and image digests;
- workflow step phases and the first error;
- the latest succeeded revision name;
- clusters and namespaces already changed;
- database or external workflow side effects; and
- the Git commit or automation that supplied the current manifest.

Application version control is most deterministic when each release sets a unique `app.oam.dev/publishVersion` annotation or uses `vela up --publish-version`. The latest-succeeded selection described below relies on that annotation. Without a non-empty publish version, `vela workflow rollback` uses `.status.latestRevision` instead of searching succeeded history. Revision retention is finite and configurable through the controller's `--application-revision-limit` setting (or an Application garbage-collection policy override), so inspect the actual configuration and do not assume an old revision still exists. In publish-version mode, the built-in rollback also requires a matching, non-deleting `ResourceTracker` for the selected revision.

Export any failed `ApplicationRevision` needed as evidence before rollback. In publish-version mode, the rollback command deletes newer revisions it skips because they are unsuccessful or have no publish version; the retention limit does not prevent this explicit cleanup.

Inspect a candidate rather than trusting its label alone:

```bash
vela revision get <revision-name> --namespace examples -o yaml
vela live-diff podinfo --namespace examples --revision <revision-name>
```

Check current CLI help for exact diff and output flags. Confirm the candidate uses images and policies that remain available and compatible with current external state.

## Stop forward progress

If the workflow is still running or suspended partway through a rollout, suspend it first:

```bash
vela workflow suspend podinfo --namespace examples
vela status podinfo --namespace examples
```

KubeVela's official version-control procedure suspends before rollback. This reduces the chance that another workflow step changes resources while desired state is being restored. Also pause or revert the upstream GitOps change; otherwise Argo CD, CI, or another automation can immediately reapply the failed Application after rollback.

Do not scale the KubeVela controller to zero as a routine rollback step. That stops reconciliation for every Application it manages and creates broader drift.

## Check state compatibility

Before reverting application code, answer:

- Did the failed version run a schema migration?
- Can the old version read data written by the new one?
- Were messages or events emitted with a new incompatible format?
- Did a workflow create or delete cloud resources?
- Did Secrets, feature flags, or APIs rotate?
- Did only some clusters receive the new version?

Use expand/contract database migrations and backward-compatible event formats so application rollback remains possible. If the old binary cannot safely operate on current state, mitigate traffic or deploy a forward fix instead of executing a controller rollback mechanically.

## Roll back a publish-versioned Application to the latest succeeded revision

After confirming the target and suspending the workflow:

```bash
vela workflow rollback podinfo --namespace examples
```

For an Application with a non-empty `app.oam.dev/publishVersion`, the command finds the latest succeeded Application revision, restores its spec, and updates the rollback-related Application status to that revision. It does not mean “previous numeric revision” if that revision also failed. Read the command output and then list revisions again.

If the goal is a specific retained revision rather than the latest success, KubeVela documents re-publishing it as a new version:

```bash
vela up podinfo --namespace examples \
  --revision <revision-name> \
  --publish-version <new-unique-version>
```

This re-runs the workflow and creates a new revision with the historical content. It can repeat workflow side effects, so review every step for idempotency first. Do not reuse an existing publish version; version control relies on unique release identity.

## Verify the rollback everywhere

```bash
vela status podinfo --namespace examples --tree --detail
vela revision list podinfo --namespace examples
vela status podinfo --namespace examples --pod
```

For each cluster and component, confirm:

- expected image digest and configuration;
- rollout complete and all replicas ready;
- Services and endpoints point only to healthy Pods;
- workflow finished without skipped remediation;
- error rate, latency, and business checks recovered; and
- no migration or external-resource alarm remains.

Kubernetes readiness is not enough. Compare telemetry to the pre-incident baseline and keep the incident window under observation. A multi-cluster rollback may converge at different speeds; do not declare success after checking only the hub or first cluster.

## Reconcile Git and controller state

The rollback command changes live desired state. In a GitOps setup, make Git agree by reverting the failed manifest or committing the chosen revision content. Keep the bad release commit for audit; revert through normal review rather than rewriting shared history.

Use one ownership model: GitOps reconciles the KubeVela `Application`, and KubeVela reconciles generated workloads. If GitOps also owns the generated Deployment, rollback can create a controller fight.

After recovery, resume normal automation only when:

- Git contains the safe desired state;
- the workflow is no longer unintentionally suspended;
- necessary failed-revision evidence was exported before rollback; and
- the next release has a new publish version.

## When the CLI rollback is not enough

For a publish-version-controlled Application, the built-in workflow rollback targets the latest succeeded Application revision. Progressive-delivery addons may also manage traffic, `ControllerRevision`, Rollout, or CloneSet resources; follow that addon's version-matched rollback documentation. Stateful systems may require provider-specific restore or point-in-time recovery.

Do not blindly delete `ApplicationRevision`, `ResourceTracker`, Helm release history, or finalizers to “unstick” rollback. These objects connect desired state, history, and garbage collection. Manual deletion can remove evidence, orphan resources, or trigger unintended cleanup.

## Improve the next release

Add preproduction tests for manifest render, policy selection, migrations, and rollback. Gate production with `suspend` or a progressive rollout, pin image digests, make workflow operations idempotent, and emit status that identifies the first failed dependency. Rehearse rollback in a representative environment while the retained revision and artifact are still available.

## Official Documentation

- [KubeVela Application version control](https://kubevela.io/docs/end-user/version-control/)
- [KubeVela `vela workflow rollback`](https://kubevela.io/docs/cli/vela_workflow_rollback/)
- [KubeVela revision commands](https://kubevela.io/docs/cli/vela_revision/)
- [KubeVela canary rollout](https://kubevela.io/docs/end-user/traits/rollout/)
- [Kubernetes Deployment rollback](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment)

## Conclusion

Suspend the failing workflow, inspect retained revisions, and verify that the latest succeeded state is compatible with current data and external side effects. For a publish-version-controlled Application, use `vela workflow rollback` for the latest successful Application revision or republish a specific retained revision under a new version. Then verify every destination and make Git agree, or automation can restore the failed release.
