# Argo Workflow Timeouts Explained: Workflow, Template, and Pod Deadlines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, Timeout, Deadlines, activeDeadlineSeconds, pendingTimeout, Reliability

Description: Understand Argo Workflow, template, pending, and Pod active deadlines, where each clock starts, how retries and Cron scheduling interact, and how to debug timeouts.

---

Argo Workflows has several fields that sound like “task timeout,” but they guard different intervals. A useful production design normally has three layers:

1. A Workflow deadline limits the wall-clock lifetime of the main run; Workflow exit handlers are exempt.
2. A template timeout limits one node, including time spent Pending.
3. A Pod active deadline limits how long a container or script Pod is active on a node.

Argo Workflows 4.1 release candidates also provide `pendingTimeout` to fail work that cannot leave Pending promptly. For work subject to multiple clocks, the first deadline reached wins, so the values should form an intentional budget rather than a collection of unrelated numbers.

## The Timeout Fields at a Glance

| Field | Location | Clock starts | Includes Pending? | Applies to |
| --- | --- | --- | --- | --- |
| `activeDeadlineSeconds` | `Workflow.spec` | Workflow start time | Yes, as part of the Workflow lifetime | Main Workflow execution; exit handlers are exempt |
| `timeout` | Template | Argo node start time | Yes | Supported leaf templates; not Steps, DAG, or Suspend templates |
| `pendingTimeout` | Template | Argo node start time | Specifically limits Pending | Supported leaf templates in Argo Workflows 4.1; not Steps, DAG, or Suspend templates |
| `activeDeadlineSeconds` | Template | Pod `StartTime` | No pre-start scheduling time | Container and script templates |
| `timeoutSeconds` | `template.http` | HTTP request | Not applicable | One Argo HTTP-template request |

The two `activeDeadlineSeconds` fields use seconds, but their scope is different. Template `timeout` and `pendingTimeout` are duration strings such as `30s`, `5m`, or `1h`.

## Limit Main Workflow Execution

Set `spec.activeDeadlineSeconds` when the main execution must finish within one global service-level objective:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: bounded-pipeline-
spec:
  entrypoint: pipeline
  activeDeadlineSeconds: 3600

  templates:
    - name: pipeline
      dag:
        tasks:
          - name: call-service
            template: call-service

    - name: call-service
      timeout: 2m
      pendingTimeout: 30s
      activeDeadlineSeconds: 90
      container:
        image: example.com/api-client:2.3.0
        args:
          - --request-timeout=60s
          - --endpoint=https://service.example.com/run
```

The main Workflow execution may run for at most 3,600 seconds from its Workflow start time. That budget includes dependencies, Pod scheduling, synchronization waits, task execution, and retry delays that occur while the Workflow is running. The controller terminates non-exit work when the deadline is reached. Workflow-level exit handlers are deliberately exempt, so they can extend the Workflow's final wall-clock lifetime beyond 3,600 seconds.

Current field documentation notes that a Workflow-level value of zero is used to terminate a Running Workflow. Do not use zero to mean “unlimited”; omit the field when no Workflow deadline is intended.

A global deadline is the final guardrail for the main execution. It should be longer than the normal critical path plus realistic scheduling, retry, and finalization time. If it is tighter than every leaf timeout combined, it can stop an otherwise healthy pipeline partway through its last task.

## Limit Total Node Time with `timeout`

The template `timeout` field counts from the Argo node's start time and includes time in Pending:

```yaml
- name: render-report
  timeout: 10m
  container:
    image: example.com/report-renderer:4.1.0
    args: ["render"]
```

This protects the caller from a node that spends five minutes waiting to schedule and then runs for another six. It is broader than the Pod active deadline because its clock starts before the Pod necessarily becomes active on a Kubernetes node.

`timeout` is supported on leaf templates, not Steps, DAG, or Suspend templates. Put it on the leaf template referenced by a step or DAG task:

```yaml
- name: pipeline
  dag:
    tasks:
      - name: render
        template: render-report

- name: render-report
  timeout: 10m
  container:
    # ...
```

Do not put a timeout only on the orchestration template and assume every descendant has inherited a hard deadline. Use the Workflow deadline for the whole graph and supported leaf-template limits for individual operations.

## Fail Unschedulable Work with `pendingTimeout`

`pendingTimeout` limits how long a supported leaf node remains in Argo's Pending phase. For Pod-producing leaves, this usually isolates the queueing and scheduling portion of the budget:

```yaml
- name: gpu-training
  pendingTimeout: 5m
  timeout: 2h
  container:
    image: example.com/trainer:7.0.0
    resources:
      requests:
        nvidia.com/gpu: "1"
```

If the node remains Pending beyond five minutes, Argo's controller can mark it Failed and delete its pending Pod if one exists. This is useful when a result is no longer valuable after a scheduling delay or when a wrong selector would otherwise wait indefinitely.

Enforcement is approximate because the controller acts on the Pod state it most recently observed. The official field reference warns that a Pod starting just as the deadline expires may still be failed. Do not use this as a sub-second coordination mechanism.

The field is supported on leaf templates, not Steps, DAG, or Suspend templates. When it fires, inspect *why* the Argo node was Pending before merely increasing it:

- Insufficient CPU, memory, GPU, or ephemeral storage.
- ResourceQuota exhaustion or controller-side Pod creation back-pressure; in this case, no Pod may exist yet.
- Unsatisfied node selector, affinity, taint, or toleration.
- An unbound PVC or unavailable topology.
- Image-pull problems after the Pod is assigned to a node.
- Template synchronization waits after the leaf node has been created.

The last case matters: DAG dependencies and parallelism limits can delay creation of the leaf node itself, so its `timeout` and `pendingTimeout` clocks have not started. The Workflow deadline still includes that wait. A synchronization wait, by contrast, can leave an existing leaf node Pending with no Pod. Inspect both the Workflow node and Pod existence/status.

## Limit Active Pod Time

Template-level `activeDeadlineSeconds` maps the operation to a Pod active deadline:

```yaml
- name: import-one-file
  activeDeadlineSeconds: 300
  container:
    image: example.com/importer:5.6.0
    args: ["import"]
```

It is a positive number of seconds relative to Pod `StartTime`. Kubernetes actively tries to terminate the Pod after that active interval. Argo supports this field only for container and script templates.

Because the clock starts when the Pod becomes active on a node, it does not bound a long pre-start scheduling delay. Combine it with `pendingTimeout` or template `timeout` when queueing time matters.

The Pod's `terminationGracePeriodSeconds` is not another execution timeout. It controls the grace period after Kubernetes asks the containers to terminate. The application should handle `SIGTERM`, stop accepting new work, checkpoint if safe, and exit before that grace period ends. A process that ignores termination may be killed and may not publish normal outputs.

## How the Three Clocks Combine

For the earlier example:

```yaml
spec:
  activeDeadlineSeconds: 3600
# leaf template
pendingTimeout: 30s
timeout: 2m
activeDeadlineSeconds: 90
```

The intended budget is:

- The leaf should leave Pending within 30 seconds.
- Its complete Argo node lifecycle should not exceed two minutes.
- Once its Pod starts, that Pod should be active for no more than 90 seconds.
- The main Workflow graph, including every other node and delay, should not exceed one hour; an exit handler may continue afterward.

If the Pod waits 25 seconds and runs for 90 seconds, the Pod deadline is the likely first limit. If it waits 40 seconds, `pendingTimeout` can fire first. If the Workflow has already consumed 59 minutes, the global deadline can stop this node before either local budget expires.

This is why a timeout message should be read together with Workflow timestamps, node timestamps, and Pod status-not inferred from the YAML value alone.

## Apply Defaults Without Losing Exceptions

`templateDefaults` can set common leaf-template policy:

```yaml
spec:
  templateDefaults:
    timeout: 20m
    pendingTimeout: 2m
  templates:
    - name: fast-health-check
      timeout: 30s
      pendingTimeout: 15s
      container:
        image: example.com/health-check:1.2.0
```

Template fields override the corresponding defaults. Because these timeout fields are intended for supported leaf templates, verify the defaults on the template types used by the Workflow rather than assuming they constrain orchestration templates.

`timeout` predates Argo Workflows 4.1, but `pendingTimeout` is new in 4.1. As of August 2, 2026, [v4.1.0-rc2](https://github.com/argoproj/argo-workflows/releases/tag/v4.1.0-rc2) is a pre-release and [v4.0.8](https://github.com/argoproj/argo-workflows/releases/tag/v4.0.8) is the latest stable release; v4.0.8 rejects `pendingTimeout` as an unknown field. Check the documentation for the installed release and keep the controller, server, CLI, and CRDs compatible before rolling it out.

## Retries Consume Time Too

Retries do not pause the Workflow clock. Attempts, scheduling delays, and exponential backoff all consume the global `spec.activeDeadlineSeconds` budget. A Workflow can therefore time out while a task is waiting for its next retry.

Bound retries independently:

```yaml
retryStrategy:
  limit: "4"
  retryPolicy: OnError
  backoff:
    duration: "10s"
    factor: 2
    cap: "2m"
    maxDuration: "10m"
```

`cap` limits an individual backoff delay. `maxDuration` bounds the elapsed retry sequence from the first attempt's start, including attempt execution and backoff delays. Argo passes that absolute deadline to later attempts, so a later attempt can be stopped when the remaining retry budget expires even if its template `activeDeadlineSeconds` would allow it to run longer. A shorter Pod active deadline can still fire first. Configure and test these together rather than assuming the original Pod deadline is the only clock on every attempt.

Use conditional retries so deterministic application failures do not consume the entire deadline. The application should also use shorter connection, request, transaction, and subprocess timeouts. That gives it time to close resources and return a useful error before Argo or Kubernetes forcibly stops it.

## Cron Deadlines Are Different

`CronWorkflow.spec.startingDeadlineSeconds` is not a runtime limit. It is the grace period during which the controller may create one late Workflow for a missed schedule. Once that Workflow exists, its execution is governed by `workflowSpec.activeDeadlineSeconds` and its template fields:

```yaml
spec:
  schedules:
    - "0 * * * *"
  startingDeadlineSeconds: 300
  workflowSpec:
    activeDeadlineSeconds: 1800
```

This permits recovery within five minutes of a missed hourly schedule and gives the resulting Workflow a separate 30-minute runtime budget.

## HTTP Templates Have a Request Timeout

An Argo HTTP template has a dedicated integer field:

```yaml
- name: trigger-service
  http:
    method: POST
    url: https://service.example.com/jobs
    timeoutSeconds: 20
```

The current field reference gives `http.timeoutSeconds` a default of 30 seconds. This is the request timeout for the HTTP template, not the Workflow deadline or a Kubernetes Pod deadline. A surrounding template/Workflow budget still provides the higher-level guardrail.

## Diagnose a Timeout

Start at the Workflow, then descend to the node and Pod:

```bash
argo get -n workflows <workflow-name>
kubectl -n workflows get workflow <workflow-name> -o yaml
kubectl -n workflows get pods \
  -l workflows.argoproj.io/workflow=<workflow-name>
kubectl -n workflows describe pod <pod-name>
```

Check:

1. Workflow `.status.startedAt`, `.status.finishedAt`, phase, message, and conditions.
2. The failed node's start/finish timestamps and message in `.status.nodes`.
3. Whether a Pod was created and how long it was Pending versus Running.
4. Pod reason and events, including Kubernetes `DeadlineExceeded` and scheduling failures.
5. Controller logs around the deadline if the status is ambiguous.
6. Retry attempts and backoff remaining when the timeout occurred.
7. `.status.storedWorkflowTemplateSpec` for a Workflow submitted with `workflowTemplateRef`, plus `.status.storedTemplates` for other resolved template references. These stored definitions may differ from today's source templates.

Finally, do not confuse execution deadlines with `ttlStrategy`. A TTL deletes a Workflow resource *after* it has finished; it does not stop a running Workflow. Timeouts protect execution, while TTL and garbage-collection settings control retention.

Choose one explicit global budget, tighter leaf budgets for risky operations, a Pending limit where late work has no value, and application timeouts short enough to fail cleanly. That layered model makes timeout behavior both predictable and diagnosable.

## Official Documentation

- [Argo Workflows: Timeouts](https://argo-workflows.readthedocs.io/en/latest/walk-through/timeouts/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Argo Workflows: Retries](https://argo-workflows.readthedocs.io/en/latest/retries/)
- [Argo Workflows: Template Defaults](https://argo-workflows.readthedocs.io/en/latest/template-defaults/)
- [Kubernetes: Pod Lifetime](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-lifetime)
