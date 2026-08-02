# Retry vs. Resubmit in Argo Workflows: How to Rerun Only Failed Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, Retry, Resubmit, Memoization, Node Field Selector

Description: Choose between Argo retry, resubmit, and memoized resubmit to rerun failed nodes safely while controlling Workflow identity, successful outputs, parameters, and side effects.

---

Argo has three operations that sound similar but create different execution histories:

- `argo retry` resets failed nodes in the **same Workflow object**;
- `argo resubmit` creates a **new Workflow** and runs it again;
- `argo resubmit --memoized` creates a new Workflow while reusing successful Pod nodes and outputs from the failed run.

If the goal is “rerun only what failed,” start with `argo retry`. If you need a distinct run name and UID for audit, retention, or changed inputs, use resubmit. Add `--memoized` only when it is safe for the new run to reuse the previous run's successful results.

## The Core Difference

| Operation | Workflow object | Successful nodes | Failed nodes | Typical use |
| --- | --- | --- | --- | --- |
| `argo retry` | Reuses name and UID | Retained | Reset and rerun | Continue the same failed run |
| `argo resubmit` | New name and UID | Not carried over; graph evaluated again | Not carried over; graph evaluated again | Clean, independent rerun |
| `argo resubmit --memoized` | New name and UID | Successful Pod nodes are reused/skipped; other node types are reevaluated | Reevaluated; failed or errored Pod nodes rerun | New run that avoids successful Pod work |

The commands are operational retries after a Workflow has run. They are different from a template's `retryStrategy`, which automatically creates another attempt while the original Workflow is still executing.

## Retry Failed Nodes in Place

For a failed live Workflow:

```bash
argo retry -n workflows data-pipeline-7mq2k --watch
```

Argo's CLI documentation defines retry as rerunning all failed steps while using the same Workflow object. Successful work that does not need to be reset remains recorded. Nodes affected by the failed path are reconciled again so the graph can proceed.

Confirm the identity before and after:

```bash
kubectl get workflow -n workflows data-pipeline-7mq2k \
  -o jsonpath='{.metadata.name}{"\t"}{.metadata.uid}{"\t"}{.status.phase}{"\n"}'

argo retry -n workflows data-pipeline-7mq2k

kubectl get workflow -n workflows data-pipeline-7mq2k \
  -o jsonpath='{.metadata.name}{"\t"}{.metadata.uid}{"\t"}{.status.phase}{"\n"}'
```

The name and UID are unchanged. Dashboards, alerts, owner references, and audit history still refer to one Workflow resource whose status moved back into execution.

Use in-place retry when:

- the Workflow object still exists;
- the failure was transient or has been fixed externally;
- the original inputs remain correct;
- successful outputs are still valid and accessible;
- one logical run should keep one identity.

## Selectively Restart a Successful Node

By default, retry targets failed work. To rerun a node that Argo marked successful, combine `--restart-successful` with a node field selector:

```bash
argo retry -n workflows data-pipeline-7mq2k \
  --restart-successful \
  --node-field-selector displayName=load-warehouse \
  --watch
```

Supported node selector fields include `id`, `name`, `displayName`, `templateName`, `phase`, `templateRef.name`, `templateRef.template`, and input parameter values. Examples:

```bash
# Select one unambiguous node ID.
argo retry -n workflows data-pipeline-7mq2k \
  --restart-successful \
  --node-field-selector id=data-pipeline-7mq2k-2185524251

# Restart successful invocations of one template; failed steps still retry.
argo retry -n workflows data-pipeline-7mq2k \
  --restart-successful \
  --node-field-selector templateName=transform,phase=Succeeded

# Select a loop item by its input parameter.
argo retry -n workflows data-pipeline-7mq2k \
  --restart-successful \
  --node-field-selector inputs.parameters.region.value=eu-west-1
```

Comma-separated selectors are ANDed. `displayName` is convenient but can match several loop or nested nodes. Prefer `id` or full `name` when only one invocation must restart.

For `argo retry`, `--node-field-selector` must be paired with `--restart-successful`. It adds matching successful nodes to the retry; it does not narrow the default set of failed steps, which are still retried.

`--restart-successful` is intentionally explicit because replaying a successful side effect can be dangerous. Check the node's descendants and external effects before using it.

## Resubmit as a New Workflow

To create a fresh run from a completed Workflow:

```bash
argo resubmit -n workflows data-pipeline-7mq2k --watch
```

Argo describes this as similar to submitting the Workflow again with the same parameters. The new object gets a generated name and a new UID, while its metadata identifies the previous Workflow.

Use a normal resubmit when:

- audit policy requires each attempt to be a separate run;
- you want the old failed object to remain immutable;
- you want the graph evaluated again without carrying node status from the source Workflow;
- cached outputs or remote artifacts may be stale or gone;
- you need to override parameters;
- the old Workflow has reached an operational state where in-place mutation is undesirable.

Override an input parameter only when you want a semantically new execution:

```bash
argo resubmit -n workflows data-pipeline-7mq2k \
  -p processing-date=2026-08-02 \
  --watch
```

Because ordinary resubmit does not carry node status from the source, changed inputs flow through the newly evaluated graph. A template's own memoization configuration is independent and can still return cached results.

## Resubmit While Reusing Successful Pod Work with `--memoized`

For a new Workflow identity that reuses successful results:

```bash
argo resubmit -n workflows data-pipeline-7mq2k \
  --memoized \
  --watch
```

Argo carries successful Pod nodes and their outputs into the new Workflow as skipped/reused nodes. Failed or errored Pod nodes and non-Pod work are reevaluated. Memoized mode is accepted for failed or errored source Workflows.

This is useful when:

- the source Workflow is complete and failed;
- successful Pod steps are expensive;
- their outputs are deterministic for the unchanged inputs;
- referenced output artifacts still exist;
- a new Workflow name/UID is required.

Do not treat `--memoized` as a general-purpose incremental build system. It reuses recorded successful Pod-node results from one run; it does not prove that databases, object-store keys, container tags, or external dependencies are unchanged.

### Do not casually override parameters in memoized mode

This combination is risky:

```bash
argo resubmit -n workflows data-pipeline-7mq2k \
  --memoized \
  -p processing-date=2026-08-02
```

Argo's implementation warns that overriding parameters on a memoized resubmission may have unexpected results. A successful upstream Pod node can be reused even though its new logical input should produce different output. If inputs change, use a normal resubmit unless you have independently proven that every reused node is unaffected.

## Verify Outputs Before Reusing Them

Successful node status can outlive the data it points to. Before retry or memoized resubmit, inspect outputs:

```bash
argo get -n workflows data-pipeline-7mq2k -o json \
  | jq -r '
      .status.nodes[]
      | select(.phase == "Succeeded")
      | {
          displayName,
          parameters: .outputs.parameters,
          artifacts: .outputs.artifacts
        }
    '
```

Using `argo get` here also handles compressed node status. When node-status offloading is enabled, configure the CLI to use Argo Server so it can retrieve the offloaded nodes.

Named output parameters are stored in Workflow status. Output artifacts usually point to S3, GCS, Azure, or another repository. A reused artifact is useful only if:

- its object still exists;
- artifact garbage collection has not removed it;
- the new Workflow's executor can read it;
- encryption keys and credentials are still valid;
- the artifact has not been overwritten by a reused key.

The same caution applies to PVCs and external tables. Retaining a successful node does not recreate storage that another cleanup process deleted.

## Account for Side Effects

Argo retries execution; it cannot roll back a remote operation. A node can create a record, time out before receiving the response, and then appear failed. Rerunning it may create the record twice.

Make replay safe with:

- idempotency keys based on Workflow UID and logical operation;
- upsert/reconcile APIs rather than blind create calls;
- unique constraints in the destination;
- checkpoints that distinguish “not started” from “committed”;
- an explicit lookup before repeating an ambiguous operation;
- cleanup or compensation designed as a separate, observable step.

Note the identity trade-off: an in-place retry keeps `workflow.uid`, so a UID-based idempotency key stays the same. A resubmit gets a new UID. If the external operation should still deduplicate across resubmissions, derive the key from a stable business key rather than only the new UID.

## Understand Pod and Log Cleanup

`argo retry` can reset nodes and delete Pods that remain from the failed attempt. Pod GC may already have removed them. Preserve diagnostics before retrying:

```bash
argo get -n workflows data-pipeline-7mq2k -o yaml > workflow-before-retry.yaml
argo logs -n workflows data-pipeline-7mq2k > logs-before-retry.txt
```

Use an external logging backend or Argo's `archiveLogs` feature when Pod deletion is aggressive. A retry that fixes the Workflow can otherwise erase the easiest path to the original failure evidence.

Do not commit captured Workflow YAML or logs blindly; both can contain parameter values, artifact locations, and sensitive application output.

## Retry an Archived Workflow

If TTL or manual cleanup removed the live Workflow but persistence archived it, use the archive-specific commands:

```bash
argo archive get -n workflows my-workflow
argo archive retry -n workflows my-workflow --watch
```

In Argo Workflows v4.1 and later, the archive CLI accepts a Workflow name or UID. The `--name` and `--uid` flags force how an identifier is interpreted; if several archived Workflows have the same name, select one by UID. Archive retry creates a new live Kubernetes object with the archived name and a new UID rather than updating an object that no longer exists.

For a completely fresh rerun from archived history, use archive resubmit:

```bash
argo archive resubmit -n workflows my-workflow --watch
```

The archive stores Workflow status, not Pod logs, and output artifacts may have independent retention. Check those dependencies before expecting an archived retry to behave like an immediate live retry.

## Permissions Differ

Operationally, the commands perform different Kubernetes actions:

- retry reads and updates the existing Workflow and may delete reset Pods;
- resubmit reads the source and creates a new Workflow;
- read/watch/log flags need their corresponding read permissions.

A retry operator commonly needs `get` and `update` on `workflows` plus `delete` on Pods in the namespace. A resubmit-only service can often use `get` and `create` on Workflows without permission to mutate the source. Determine which Kubernetes identity the installed Argo Server auth mode uses, then test that identity with `kubectl auth can-i`, using `--as` where appropriate.

Keeping these roles separate is useful: some teams allow users to create new runs but reserve mutation of an existing audit object for operators.

## A Practical Decision Guide

Choose `argo retry` when all of these are true:

- the Workflow still exists and is failed;
- its inputs are still correct;
- successful outputs remain valid;
- continuing under the same name and UID is desirable.

Choose `argo resubmit --memoized` when:

- you need a new name and UID;
- the source is failed or errored;
- inputs are unchanged;
- successful Pod results and artifacts are still valid;
- avoiding repeated successful Pod work matters.

Choose ordinary `argo resubmit` when:

- inputs or intended behavior changed;
- the graph should be evaluated again without reusing node status from the source Workflow;
- reused outputs are uncertain;
- the prior run should remain immutable and independent.

Use `--restart-successful --node-field-selector` only when a specifically selected successful node must be replayed and its side effects are safe to repeat.

## Validate the Result

After the operation, inspect identity and nodes:

```bash
RESULT_WORKFLOW_NAME=data-pipeline-new-name

argo get -n workflows "$RESULT_WORKFLOW_NAME"

argo get -n workflows "$RESULT_WORKFLOW_NAME" -o json \
  | jq -r '
      .metadata as $m
      | "name=\($m.name) uid=\($m.uid)",
        (.status.nodes[] | [
          .displayName,
          .type,
          .phase,
          (.message // "")
        ] | @tsv)
    '
```

For retry, confirm failed nodes received new attempts while unrelated successful nodes stayed intact. For memoized resubmit, confirm the new UID and identify reused/skipped nodes whose messages name the original Pod IDs. Finally, validate the external outcome-not only the final green Workflow phase.

## Official Documentation

- [Argo Workflows: `argo retry`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_retry/)
- [Argo Workflows: `argo resubmit`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_resubmit/)
- [Argo Workflows: Node Field Selectors](https://argo-workflows.readthedocs.io/en/latest/node-field-selector/)
- [Argo Workflows: `argo archive retry`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_archive_retry/)
- [Argo Workflows: `argo archive resubmit`](https://argo-workflows.readthedocs.io/en/latest/cli/argo_archive_resubmit/)
- [Argo Workflows: Workflow Archive](https://argo-workflows.readthedocs.io/en/latest/workflow-archive/)
- [Argo Workflows: Artifacts and Artifact Garbage Collection](https://argo-workflows.readthedocs.io/en/latest/walk-through/artifacts/)
