# How to Use Argo Workflow Exit Handlers for Cleanup and Failure Notifications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, Exit Handlers, Cleanup, Failure Notifications, Lifecycle Hooks, Reliability

Description: Use Argo Workflow exit handlers to run idempotent cleanup and status-aware notifications after success, failure, or error, with safe secrets, retries, and stop behavior.

---

An Argo Workflow exit handler is a template that runs at the end of the Workflow regardless of whether the primary work succeeded, failed, or errored. It is the right place to release temporary external resources, publish final status, and send failure notifications that need the completed Workflow context.

Add the handler with one field:

```yaml
spec:
  entrypoint: main
  onExit: exit-handler
```

`onExit` names another template in the Workflow. That template can be a container, script, steps, or DAG template, so cleanup and notification logic can have its own dependencies, conditions, and retries.

## A Complete Cleanup and Notification Pattern

The following Workflow always attempts cleanup, then sends exactly one status-specific notification path. `continueOn` prevents a cleanup failure from stopping the later notification steps inside the exit handler.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: report-
spec:
  entrypoint: main
  onExit: exit-handler

  arguments:
    parameters:
      - name: temporary-prefix
        value: reports/staging

  templates:
    - name: main
      container:
        image: alpine:3.23
        command: [sh, -c]
        args: ["echo producing report; sleep 10"]

    - name: exit-handler
      steps:
        - - name: cleanup
            template: cleanup
            continueOn:
              failed: true
              error: true
        - - name: notify-failure
            template: notify
            when: "{{=workflow.status != 'Succeeded'}}"
          - name: record-success
            template: record-success
            when: "{{=workflow.status == 'Succeeded'}}"

    - name: cleanup
      retryStrategy:
        limit: "3"
        retryPolicy: Always
        backoff:
          duration: "5s"
          factor: 2
          cap: "30s"
      container:
        image: example.com/storage-cleaner:1.8.0
        args:
          - delete-prefix
          - "{{workflow.parameters.temporary-prefix}}/{{workflow.uid}}"

    - name: notify
      retryStrategy:
        limit: "3"
        retryPolicy: Always
        backoff:
          duration: "5s"
          factor: 2
          cap: "30s"
      script:
        image: python:3.13-alpine
        command: [python]
        env:
          - name: WORKFLOW_NAME
            value: "{{workflow.name}}"
          - name: WORKFLOW_UID
            value: "{{workflow.uid}}"
          - name: WORKFLOW_STATUS
            value: "{{workflow.status}}"
          - name: WORKFLOW_DURATION
            value: "{{workflow.duration}}"
          - name: WORKFLOW_FAILURES
            value: "{{workflow.failures}}"
          - name: WEBHOOK_URL
            valueFrom:
              secretKeyRef:
                name: workflow-notifier
                key: url
          - name: WEBHOOK_TOKEN
            valueFrom:
              secretKeyRef:
                name: workflow-notifier
                key: token
        source: |
          import json
          import os
          import urllib.request

          payload = {
              "name": os.environ["WORKFLOW_NAME"],
              "uid": os.environ["WORKFLOW_UID"],
              "status": os.environ["WORKFLOW_STATUS"],
              "durationSeconds": os.environ["WORKFLOW_DURATION"],
              "failures": json.loads(os.environ["WORKFLOW_FAILURES"]),
          }
          request = urllib.request.Request(
              os.environ["WEBHOOK_URL"],
              data=json.dumps(payload).encode("utf-8"),
              headers={
                  "Authorization": "Bearer " + os.environ["WEBHOOK_TOKEN"],
                  "Content-Type": "application/json",
              },
              method="POST",
          )
          with urllib.request.urlopen(request, timeout=15) as response:
              if response.status >= 300:
                  raise RuntimeError(f"notification returned {response.status}")

    - name: record-success
      container:
        image: alpine:3.23
        command: [echo]
        args: ["workflow {{workflow.name}} succeeded in {{workflow.duration}} seconds"]
```

In a real cleanup image, treat “resource not found” as success. A retry or operator action can cause cleanup logic to encounter an already-deleted resource.

## Use the Final Workflow Variables

The two variables specific to exit handlers are:

- `workflow.status`: one of `Succeeded`, `Failed`, or `Error` for the primary Workflow outcome.
- `workflow.failures`: a JSON list describing failed or errored nodes.

Each entry in `workflow.failures` can contain `displayName`, `message`, `templateName`, `phase`, `podName`, and `finishedAt`. Pass it as data and parse it as JSON. Avoid embedding it directly into a shell command or hand-building a JSON string around it; quotes and failure messages can break both formats.

Global Workflow variables remain useful in the handler:

- `workflow.name`, `workflow.namespace`, and `workflow.uid` identify the exact run.
- `workflow.duration` is an estimated duration in seconds and can differ from wall-clock duration slightly.
- `workflow.parameters.<name>` carries cleanup identifiers known at submission time.
- `workflow.outputs.parameters.<name>` and global output artifacts can carry completed results when they exist.
- `workflow.scheduledTime` identifies the logical schedule time for a Workflow created by a CronWorkflow.

Prefer the immutable UID for external resource ownership or idempotency. A generated Workflow name is useful to humans, but the UID prevents ambiguity if a name is later reused.

## Condition on Status Inside the Handler

The exit handler itself runs for all three outcomes. Put status conditions on its child steps or DAG tasks:

```yaml
when: "{{=workflow.status == 'Succeeded'}}"
```

or:

```yaml
when: "{{=workflow.status != 'Succeeded'}}"
```

Treat both `Failed` and `Error` as unsuccessful unless the operational response differs:

- `Failed` commonly represents application or command failure.
- `Error` commonly represents an Argo, Kubernetes, input-resolution, or infrastructure problem.

If they need different destinations, add explicit branches for each value. An expression tag keeps the value typed in the expression engine and avoids fragile nested quoting.

## Make Cleanup Idempotent

“Always runs” describes normal Workflow completion processing; it does not provide exactly-once delivery. A cleanup or notification may be retried, a Workflow may be retried or resubmitted, and a controller may reconcile after a transient failure.

Design the handler for at-least-once execution:

- Derive resource names from `workflow.uid` or another stable run identifier.
- Make deletion succeed when the resource is already absent.
- Use an idempotency key such as `<workflow.uid>:final-status` for notification APIs.
- Use bounded retries with backoff for transient failures.
- Set network timeouts so a broken notification endpoint does not hang completion indefinitely.
- Record handler attempts in a durable system when cleanup is business-critical.

Avoid a broad command such as “delete all temporary objects.” Pass the exact prefix, lease ID, namespace/name pair, or cloud resource ID created by the Workflow. The Workflow service account and cloud identity should have only the permissions required for those targets.

## Prefer Native Garbage Collection When It Fits

An exit handler should not replace a built-in lifecycle feature:

- Use Kubernetes owner references for resources that should disappear with an owning object.
- Use Argo artifact garbage collection for managed artifacts.
- Use `podGC` and `ttlStrategy` for Workflow Pods and completed Workflow resources.
- Use cloud-native expiry policies for temporary object prefixes and snapshots.

These mechanisms remain effective even if an operator bypasses the exit handler. Use `onExit` for external cleanup that needs an API call, for final status publication, or to coordinate several cleanup operations.

## `argo stop` and `argo terminate` Behave Differently

This operational difference is critical:

```bash
argo stop -n workflows <workflow-name>
```

`argo stop` stops the Workflow while allowing its exit handlers to run.

```bash
argo terminate -n workflows <workflow-name>
```

`argo terminate` stops it immediately and **does not run exit handlers**, as the current CLI documentation explicitly states. Use terminate only when immediate shutdown matters more than in-Workflow cleanup. Run a separate cleanup procedure afterward if the Workflow owned external resources.

Direct deletion of a Workflow resource also should not be your only cleanup plan. For high-value resources, combine an idempotent exit handler with a periodic reconciler that finds expired leases by Workflow UID or timestamp.

## Exit Handlers vs. Lifecycle Hooks

An exit handler waits until the primary Workflow has reached a terminal outcome. This makes final outputs, `workflow.status`, and `workflow.failures` appropriate inputs.

A lifecycle hook is different: it triggers once during execution when its expression becomes true and runs in parallel with the associated Workflow or template. It is useful for an early “Workflow is running” or “failure detected” signal. Because the hooked step is still executing, its own outputs are not yet available to that hook.

Argo's lifecycle-hook syntax also reserves the hook name `exit`; a hook with that name behaves as an exit handler. Use `onExit` when a single final Workflow handler is the clearest representation, and ordinary named lifecycle hooks for notifications that must start before completion.

## Reuse a Standard Handler Carefully

Cleanup and notification behavior is often standardized in a `WorkflowTemplate`. Keep its interface small:

- Workflow identity and status can come from global variables.
- Business-specific identifiers should be Workflow parameters or global outputs.
- Secrets should come from `SecretKeyRef`, not parameters, annotations, or inline YAML.
- The handler's service account must have the permissions required by cleanup templates.

Do not assume every primary branch produced every output. A failed, skipped, or omitted producer may have no value. Use documented output defaults or separate conditional tasks rather than referencing an absent output unconditionally from the handler.

## Test Every Terminal Path

Before relying on the handler in production, submit controlled Workflows that:

1. Succeed.
2. Exit non-zero and become `Failed`.
3. Produce an Argo or infrastructure `Error`.
4. Fail the cleanup endpoint transiently, then recover.
5. Return a duplicate-cleanup “not found” response.
6. Are stopped with `argo stop`.
7. Are terminated with `argo terminate`, followed by the documented fallback cleanup.

Inspect the handler nodes with `argo get <workflow-name>` and their logs with `argo logs`. Alert separately when an exit-handler node fails; otherwise the notification system meant to report the original failure can fail silently too.

The reliable pattern is simple: attach one final handler, branch on the completed status, pass structured data safely, make cleanup idempotent, and maintain an out-of-band safety net for immediate termination or resource deletion.

## Official Documentation

- [Argo Workflows: Exit Handlers](https://argo-workflows.readthedocs.io/en/latest/walk-through/exit-handlers/)
- [Argo Workflows: Workflow Variables](https://argo-workflows.readthedocs.io/en/latest/variables/)
- [Argo Workflows: Lifecycle Hooks](https://argo-workflows.readthedocs.io/en/latest/lifecyclehook/)
- [Argo CLI: argo stop](https://argo-workflows.readthedocs.io/en/latest/cli/argo_stop/)
- [Argo CLI: argo terminate](https://argo-workflows.readthedocs.io/en/latest/cli/argo_terminate/)
- [Argo Workflows: Field Reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
