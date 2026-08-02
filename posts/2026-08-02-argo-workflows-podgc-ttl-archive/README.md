# PodGC, TTLStrategy, and Workflow Archive: What Gets Deleted-and When?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, PodGC, TTLStrategy, Workflow Archive, Garbage Collection, Retention, Operation

Description: Understand exactly how Argo Workflows PodGC, TTLStrategy, and the Workflow Archive affect Pods, live Workflow resources, archived records, logs, and artifacts.

---

Argo Workflows has three retention features whose names are easy to blur together. They operate on three different things:

- `podGC` removes completed Workflow Pods from Kubernetes;
- `ttlStrategy` removes the completed `Workflow` custom resource from Kubernetes;
- the Workflow Archive stores completed Workflow status in a database, with its own optional `archiveTTL`.

None of those features is a general-purpose backup, and none automatically guarantees that container logs or artifacts remain available. A safe retention policy starts by deciding separately how long you need Pods, live Workflow objects, archived Workflow history, logs, and artifacts.

## The Short Version

| Setting | Object affected | Clock or trigger | What remains |
| --- | --- | --- | --- |
| `podGC.strategy: OnPodCompletion` | Completed Pods | Each Pod completes | Workflow CR remains |
| `podGC.strategy: OnPodSuccess` | Successful Pods | Each Pod succeeds | Failed Pods and Workflow CR remain |
| `podGC.strategy: OnWorkflowCompletion` | Completed Pods | Workflow completes | Workflow CR remains |
| `podGC.strategy: OnWorkflowSuccess` | Completed Pods | Workflow succeeds | Workflow CR remains; Pods from failed Workflows remain |
| `ttlStrategy` | Completed Workflow CR | Selected TTL expires | An archive record can remain if archiving is enabled |
| `persistence.archiveTTL` | Archived database record | Archive retention expires and archive GC runs | It does not control Kubernetes objects |

There are two additional cleanup mechanisms to treat independently:

- Kubernetes garbage collection can remove Pods owned by a Workflow when the Workflow CR itself is deleted.
- Argo Artifact GC can delete stored artifacts on Workflow completion or deletion, depending on `artifactGC` configuration.

## What PodGC Deletes

`podGC` controls deletion of completed Pods created for Workflow nodes. It does **not** delete the Workflow CR, the Workflow Archive record, or artifact objects in S3-compatible storage.

The supported strategies have deliberately different failure behavior:

- `OnPodCompletion` queues a Pod after it reaches any completed outcome.
- `OnPodSuccess` queues only Pods that succeeded.
- `OnWorkflowCompletion` waits for the entire Workflow to complete, then queues its completed Pods.
- `OnWorkflowSuccess` waits for a successful Workflow. A failed or errored Workflow does not meet that trigger.
- If `strategy` is unset, PodGC does not delete Pods.

Use `deleteDelayDuration` to keep an eligible Pod for an additional interval after it enters the Pod GC queue:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: retention-example-
  namespace: workflows
spec:
  entrypoint: main
  podGC:
    strategy: OnWorkflowCompletion
    deleteDelayDuration: 10m
  templates:
    - name: main
      container:
        image: alpine:3.23
        command: [sh, -c]
        args: ['echo "work complete"']
```

That ten-minute delay is useful when a log collector needs time to read the last records or an operator needs a brief debugging window. It is not a durable log-retention mechanism. Once the Pod is gone, `kubectl logs` cannot retrieve its container log from Kubernetes.

`podGC.labelSelector` can narrow which Workflow Pods are eligible. Be careful with a selector-based policy: Pods that do not match remain until another mechanism, such as owner-reference garbage collection after Workflow deletion, removes them.

### Choose a PodGC trigger deliberately

For a busy production cluster with external logs, `OnPodCompletion` minimizes completed-Pod accumulation. For a smaller debugging window, combine it with a delay. `OnWorkflowCompletion` is easier for investigating a run while it is active because all of its Pods remain until the run finishes.

`OnPodSuccess` and `OnWorkflowSuccess` are useful when failed runs need live Pods for investigation. They also mean failures can accumulate indefinitely if nothing else deletes the Workflow or its Pods. Pair them with a bounded `ttlStrategy` or an operational cleanup policy.

## What TTLStrategy Deletes

`ttlStrategy` controls the lifetime of a **completed Workflow CR**. Its fields are durations in seconds:

- `secondsAfterCompletion` applies after any terminal outcome and acts as the fallback;
- `secondsAfterSuccess` overrides it for a Workflow in the `Succeeded` phase;
- `secondsAfterFailure` overrides it for a Workflow in the `Failed` phase.

A Workflow in the `Error` phase does not use `secondsAfterFailure`, so set `secondsAfterCompletion` if errored runs must also expire.

The outcome-specific field lets you retain failures longer than successes:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: bounded-history-
  namespace: workflows
spec:
  entrypoint: main
  ttlStrategy:
    secondsAfterCompletion: 604800   # 7 days; also covers Error
    secondsAfterSuccess: 86400      # 1 day
    secondsAfterFailure: 604800     # 7 days
  podGC:
    strategy: OnWorkflowCompletion
    deleteDelayDuration: 10m
  templates:
    - name: main
      container:
        image: alpine:3.23
        command: [sh, -c]
        args: ['echo "done"']
```

Here, Pods become eligible ten minutes after the Workflow completes. The live Workflow object remains for one day after success or seven days after failure or error. The two timers are independent; `ttlStrategy` does not wait for `podGC` to finish before its own TTL expires.

When the Workflow CR is deleted, Kubernetes owner-reference garbage collection normally removes dependent Pods that are still owned by it. That is a consequence of deleting the owner, not the `podGC` strategy. Finalizers and Artifact GC work can affect the deletion sequence, so inspect an object that remains in `Terminating` rather than assuming the TTL controller failed.

Check the effective TTL and deletion state with:

```bash
kubectl get workflow -n workflows <workflow-name> -o yaml
kubectl get workflow -n workflows <workflow-name> \
  -o jsonpath='{.status.phase}{"\n"}{.status.finishedAt}{"\n"}{.metadata.deletionTimestamp}{"\n"}'
kubectl get events -n workflows \
  --field-selector involvedObject.name=<workflow-name> \
  --sort-by=.lastTimestamp
```

If TTL deletions lag across the cluster, inspect controller logs and capacity. Argo exposes `--workflow-ttl-workers` specifically for increasing TTL cleanup concurrency when the controller has enough CPU.

## What the Workflow Archive Stores

The Workflow Archive is a database-backed historical record. With persistence and `archive: true` configured, Argo stores completed Workflow status: the Workflow metadata, node execution history, phases, timestamps, results, and related status needed to list or inspect archived runs.

It does **not** archive Workflow Pod logs. If logs must survive Pod deletion, ship them to a Kubernetes logging backend or configure Argo archive logs with an artifact repository.

A controller configuration can enable archiving and set an independent database retention period:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: workflow-controller-configmap
  namespace: argo
data:
  config: |
    persistence:
      archive: true
      archiveTTL: 90d
      postgresql:
        host: postgres.example.internal
        port: 5432
        database: argo
        tableName: argo_workflows
        userNameSecret:
          name: argo-postgres-config
          key: username
        passwordSecret:
          name: argo-postgres-config
          key: password
```

The referenced Secret belongs in the Workflow controller's namespace. Use a production-quality database service, backup it according to your recovery requirements, and test restore procedures. The quick-start database is intended for convenience, not production durability.

`archiveTTL` defaults to retaining archived workflows forever. When configured, it determines how long archive rows are kept. `ARCHIVED_WORKFLOW_GC_PERIOD` controls how often archive garbage collection runs. The controller starts the ticker when it starts; the first pass occurs after that period, so expiry is not guaranteed at the exact second the TTL elapses.

The archive remains conceptually separate from the live CR:

```bash
# Live Kubernetes objects
argo list -n workflows

# Database-backed history
argo archive list -n workflows
argo archive get <workflow-name> -n workflows
```

Deleting a live Workflow through `ttlStrategy` does not mean its archived record is immediately deleted. Conversely, archive GC does not delete the live Workflow or its Pods.

## A Practical Production Retention Policy

A common policy is:

1. Ship Pod logs to a durable, searchable backend.
2. Keep completed Pods for 5–15 minutes so collectors can drain and operators can inspect immediate failures.
3. Keep successful live Workflow CRs for a day and failed or errored ones for several days.
4. Keep archive history for the audit or operational period, such as 90 days.
5. Apply an explicit lifecycle to log storage and artifacts.

You can set defaults for every Workflow handled by a controller:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: workflow-controller-configmap
  namespace: argo
data:
  workflowDefaults: |
    spec:
      podGC:
        strategy: OnWorkflowCompletion
        deleteDelayDuration: 10m
      ttlStrategy:
        secondsAfterCompletion: 604800
        secondsAfterSuccess: 86400
        secondsAfterFailure: 604800
```

Workflow-level values can override these defaults. Treat that as part of your platform contract: decide whether teams may extend retention and whether admission policy should cap it.

## Do Not Forget Logs, Artifacts, and PVCs

The following are not interchangeable with the three main features:

- **Archive logs** stores container logs as artifacts when configured. It is separate from the Workflow Archive database.
- **Artifact GC** controls supported artifact deletion using `OnWorkflowCompletion`, `OnWorkflowDeletion`, or per-artifact overrides.
- **VolumeClaimGC** controls PVC deletion after Workflow completion or success.
- **External log retention** is controlled by the logging platform, regardless of how long Argo objects survive.

This distinction matters when policy requirements use words such as “retain a run for 90 days.” Translate that sentence into concrete objects: Workflow metadata, node results, application logs, input/output artifacts, PVC data, and Kubernetes events can all have different lifetimes.

## Troubleshoot Cleanup in the Right Layer

If Pods are not disappearing, inspect `spec.podGC`, Pod phase, label-selector matching, controller logs, and `--pod-cleanup-workers` capacity.

If the Workflow CR is not disappearing, inspect its terminal phase and `finishedAt`, the effective `ttlStrategy`, deletion timestamp, finalizers, controller leader health, and TTL worker backlog.

If archived records are not disappearing, inspect `persistence.archiveTTL`, `ARCHIVED_WORKFLOW_GC_PERIOD`, database connectivity, and archive GC logs. Do not change `ttlStrategy`; it governs a different store.

If history disappeared too soon, identify which layer lost it before restoring anything. A missing live CR can still have an archive record. A missing Pod can still have external or archived logs. A deleted artifact is not recovered from Workflow status.

## Official Documentation

- [Argo Workflows example: Pod GC strategies](https://github.com/argoproj/argo-workflows/blob/main/examples/pod-gc-strategy.yaml)
- [Argo Workflows field reference: PodGC, TTLStrategy, and VolumeClaimGC](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Argo Workflows: Workflow Archive](https://argo-workflows.readthedocs.io/en/latest/workflow-archive/)
- [Argo Workflows: Configuring archive logs](https://argo-workflows.readthedocs.io/en/latest/configure-archive-logs/)
- [Argo Workflows: Artifact garbage collection](https://argo-workflows.readthedocs.io/en/latest/walk-through/artifacts/#artifact-garbage-collection)
- [Argo Workflows: Default Workflow spec](https://argo-workflows.readthedocs.io/en/latest/default-workflow-specs/)
- [Argo Workflows: Scaling](https://argo-workflows.readthedocs.io/en/latest/scaling/)
- [Kubernetes: Owners and dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/)
