# Controlling Argo Workflows Concurrency with parallelism, Semaphores, and Mutexes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, Concurrency, Parallelism, Semaphores, Mutexes, Synchronization

Description: Control Argo Workflows concurrency at the Workflow, template, controller, and shared-resource levels with parallelism limits, ConfigMap semaphores, and mutexes.

---

Argo Workflows can create hundreds of runnable nodes in seconds. That is useful for throughput, but dangerous when the cluster, a database, or a deployment environment has less capacity than the Workflow graph.

Argo provides three complementary controls:

- `parallelism` caps concurrent work inside one Workflow or template.
- A semaphore allows a configured number of Workflows or template invocations to hold a shared lock.
- A mutex permits exactly one holder of a shared lock.

There is also controller-level parallelism, which limits how many Workflows the controller executes globally or per namespace. Picking the correct boundary is more important than the numeric limit.

## The Concurrency Boundaries

| Control | Scope | Typical purpose |
| --- | --- | --- |
| `spec.parallelism` | Nodes within one Workflow | Bound the total fan-out of one run |
| Template `parallelism` | Concurrent executions inside a template invocation | Bound a loop or DAG branch locally |
| Workflow-level semaphore | Workflow instances sharing a lock | Limit concurrent batch runs |
| Template-level semaphore | Calls to a protected template sharing a lock | Protect a pool such as database connections |
| Mutex | One Workflow or template at a time per lock | Serialize a deployment or migration |
| Controller `parallelism` | Workflow executions handled by a controller | Protect controller/cluster-wide capacity |

`parallelism` is local to a Workflow. It cannot enforce “only five database writers across every Workflow.” A synchronization lock can.

## Cap One Workflow with `spec.parallelism`

This Workflow may expand 100 tasks, but Argo restricts concurrent work in the Workflow to 12 executions:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: bounded-fanout-
spec:
  entrypoint: fanout
  parallelism: 12

  templates:
    - name: fanout
      dag:
        tasks:
          - name: process
            template: process-one
            arguments:
              parameters:
                - name: shard
                  value: "{{item}}"
            withSequence:
              count: "100"

    - name: process-one
      inputs:
        parameters:
          - name: shard
      container:
        image: alpine:3.23
        command: [sh, -c]
        args: ['printf "processing shard %s\\n" "$SHARD"; sleep 10']
        env:
          - name: SHARD
            value: "{{inputs.parameters.shard}}"
```

This is a per-Workflow ceiling. If ten copies of the Workflow run, each copy can use up to its own limit. Kubernetes scheduling, quotas, resource requests, dependencies, and synchronization locks may reduce the actual concurrency further.

## Limit a Specific DAG or Loop

Place `parallelism` on a DAG or steps template when one section needs a tighter cap than the rest of the Workflow:

```yaml
- name: database-fanout
  parallelism: 4
  dag:
    tasks:
      - name: update-account
        template: update-one
        arguments:
          parameters:
            - name: account
              value: "{{item}}"
        withParam: "{{inputs.parameters.accounts}}"
  inputs:
    parameters:
      - name: accounts
```

The limit applies within that template invocation. Nested templates inherit the constraints imposed by their parents, so the effective concurrency is the tightest applicable bound.

Use this for fairness within one run, memory-intensive workers, or a fan-out that should progress in small batches. It still does not coordinate with another Workflow.

## Protect Shared Capacity with a Semaphore

A local Argo semaphore takes its size from a ConfigMap. This example creates a capacity of three:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: workflow-concurrency
  namespace: workflows
data:
  database-writes: "3"
```

Attach the semaphore to the template that performs the protected operation:

```yaml
- name: write-database
  synchronization:
    semaphores:
      - configMapKeyRef:
          name: workflow-concurrency
          key: database-writes
  inputs:
    parameters:
      - name: record
  container:
    image: example.com/database-writer:1.4.2
    args: ["--record", "{{inputs.parameters.record}}"]
```

Across all relevant template invocations known to that controller, at most three holders of this lock can run concurrently. Other invocations wait for a permit.

Put `synchronization` at Workflow spec level instead when the *entire Workflow* should consume one permit:

```yaml
spec:
  synchronization:
    semaphores:
      - configMapKeyRef:
          name: workflow-concurrency
          key: batch-runs
```

The ConfigMap value is a quoted positive integer. The controller needs permission to read it. Argo watches the ConfigMap and updates the local semaphore size, which makes the limit operationally adjustable without changing every Workflow definition.

Semaphore identity includes a namespace and key. By default, Argo uses the Workflow namespace. A lock reference can specify another namespace to share a ConfigMap-backed limit between namespaces, but the controller must be able to read that ConfigMap there.

## Serialize a Critical Section with a Mutex

A mutex is a lock with capacity one. A template-level mutex is appropriate for an operation that must never overlap, such as promoting a single production environment:

```yaml
- name: deploy-production
  synchronization:
    mutexes:
      - name: production-deploy
  container:
    image: example.com/deployer:2.7.0
    args: ["deploy", "production"]
```

Every template invocation using the same mutex identity waits its turn. A Workflow-level mutex serializes whole Workflow runs:

```yaml
spec:
  synchronization:
    mutexes:
      - name: schema-migration
```

Use the current plural fields, `mutexes` and `semaphores`. The older singular forms shown in historical examples are deprecated.

A lock is coordination, not a transaction. If the protected program updates an external system and crashes, the next holder still needs to detect partial work. Keep operations idempotent and use the external system's transaction or compare-and-swap features where correctness requires them.

## Understand Local and Database Locks

ConfigMap semaphores and ordinary mutexes are local to the Workflow controller managing them. They coordinate Workflows running on that controller. They do not automatically synchronize two independent controllers or clusters.

Argo supports database-backed locks for that topology. All participating controllers must share the synchronization tables in a configured PostgreSQL, MySQL, or MariaDB database.

A database mutex looks like this:

```yaml
synchronization:
  mutexes:
    - name: production-deploy
      database: true
```

A database semaphore uses a database key:

```yaml
synchronization:
  semaphores:
    - database:
        key: database-writes
```

The semaphore limit is stored in Argo's limit table. The official documentation uses `<namespace>/<key>` in that table, while the internal state uses lock-type prefixes. Configure every controller with the same database and keep cluster clocks synchronized; timestamps participate in queue ordering and controller health decisions.

Do not select database locks merely because a Workflow uses a database. Select them when multiple Argo controllers must agree on the same lock. A single controller can protect database capacity with a local ConfigMap semaphore.

## Set Controller-Wide Limits

The Workflow controller ConfigMap can bound concurrent Workflow executions:

```yaml
data:
  parallelism: "10"
  namespaceParallelism: "4"
```

`parallelism` is the controller-wide maximum. `namespaceParallelism` is the default per-namespace maximum. A namespace label can override the latter:

```yaml
metadata:
  labels:
    workflows.argoproj.io/parallelism-limit: "2"
```

The controller needs `get`, `list`, and `watch` access to Namespace objects for label-based limits. The official docs note that omission is not fatal—the feature simply does not work—so verify RBAC rather than assuming the label is active.

These settings limit Workflow executions, not a precise number of Pods. A Workflow that is executing but unable to run more nodes because of another limit still counts toward controller parallelism. Use Kubernetes quotas and Argo's Workflow/template controls for the resource boundary they actually govern.

## Queue Ordering and Priority

When a Workflow cannot acquire a lock, Argo places it in an ordered queue. Higher `spec.priority` values come first; equal-priority Workflows are ordered by creation timestamp, oldest first.

Controller-level parallelism also considers Workflow priority. Priority is useful for urgent production work, but it is not a reservation system. Namespace limits and other locks can still prevent a high-priority Workflow from starting.

If one Workflow requires multiple locks, it waits until all are available. The synchronization docs warn that a Workflow at the head of a queue while waiting for multiple locks can also hold up Workflows that need only a subset. Prefer a small, consistent lock set and avoid unnecessarily broad critical sections.

## Diagnose Work That Appears Stuck

A waiting synchronization node is different from a Kubernetes Pod that cannot schedule. Start with the Workflow status:

```bash
kubectl -n workflows get workflow <workflow-name> \
  -o jsonpath='{.status.synchronization}'
```

Then inspect the full Workflow and controller logs:

```bash
argo get -n workflows <workflow-name>
kubectl -n argo logs deployment/workflow-controller --since=30m
```

Check these conditions in order:

1. Is the Workflow waiting for a mutex or semaphore in `.status.synchronization`?
2. Does the referenced ConfigMap and key exist in the effective lock namespace?
3. Is the limit a positive integer, and can the controller read the ConfigMap?
4. Are multiple Workflows using exactly the same lock identity?
5. Are the Workflows managed by the same controller, or should this be a database lock?
6. Is `spec.parallelism`, template `parallelism`, controller parallelism, or namespace parallelism the actual bottleneck?
7. If Pods exist but remain Pending, are Kubernetes quotas, node capacity, affinity, or PVC binding responsible instead?

For database locks, inspect the Argo synchronization limit, state, lock, and controller-heartbeat tables using the queries in the official synchronization guide. Avoid manually changing state unless you have positively identified a permanently removed controller and understand the recovery procedure.

## A Practical Layered Policy

A robust production policy commonly uses several layers:

- Controller limits keep the total number of active Workflows manageable.
- Namespace limits preserve fairness between teams.
- Workflow `parallelism` prevents one large run from flooding the cluster.
- Template `parallelism` bounds a particularly expensive fan-out.
- A semaphore models a shared service's real capacity.
- A mutex serializes the few operations that truly require exclusivity.

Set each limit from observed capacity, not an arbitrary round number. Monitor queue time, Pod startup latency, downstream throttling, and lock wait status, then adjust the narrowest control that represents the constrained resource.

## Official Documentation

- [Argo Workflows: Synchronization](https://argo-workflows.readthedocs.io/en/latest/synchronization/)
- [Argo Workflows: Limiting Parallelism](https://argo-workflows.readthedocs.io/en/latest/parallelism/)
- [Argo Workflows: Managing Synchronization Limits via API](https://argo-workflows.readthedocs.io/en/latest/synchronization-config/)
- [Argo Workflows: Workflow Controller ConfigMap](https://argo-workflows.readthedocs.io/en/latest/workflow-controller-configmap/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
