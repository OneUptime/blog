# Why Argo Sensor Triggers Do Not Wait for Each Other

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Events, Argo Workflows, Sensor, Workflow DAG, Sequencing, Event-Driven Automation

Description: Avoid relying on Argo Sensor trigger order, and move dependent actions into one Workflow where sequencing, retries, and outputs are explicit.

---

The `triggers` list in an Argo Events Sensor is a set of actions, not a sequence of workflow steps. When a dependency condition is satisfied, eligible triggers execute as part of the Sensor's trigger cycle. Their YAML order does not create a completion dependency, and one trigger's success is not automatically an input event for the next.

If action B must run only after action A succeeds, put A and B in one Argo Workflow. That gives the Workflow controller ownership of ordering, retries, outputs, timeouts, synchronization, exit handling, and status.

## Recognize the Unsafe Pattern

This shape looks sequential to a reader but does not promise sequencing:

```yaml
spec:
  dependencies:
    - name: release-request
      eventSourceName: releases
      eventName: requested
  triggers:
    - template:
        name: migrate-database
        conditions: release-request
        argoWorkflow:
          operation: submit
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: migrate-
              spec:
                workflowTemplateRef:
                  name: migrate-database
    - template:
        name: deploy-application
        conditions: release-request
        argoWorkflow:
          operation: submit
          source:
            resource:
              apiVersion: argoproj.io/v1alpha1
              kind: Workflow
              metadata:
                generateName: deploy-
              spec:
                workflowTemplateRef:
                  name: deploy-application
```

Both triggers depend on the same incoming event. Nothing says `deploy-application` depends on completion of `migrate-database`. The second Workflow can be submitted while the first is still pending, running, or failing.

Trigger retry settings do not change this. `retryStrategy` retries execution of a trigger, such as an unsuccessful submission or HTTP call. It does not wait for a separate trigger to finish before starting the next list item.

## Submit One Orchestrating Workflow

Create one `WorkflowTemplate` that owns the business sequence:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: WorkflowTemplate
metadata:
  name: release-service
  namespace: argo-events
spec:
  entrypoint: release
  arguments:
    parameters:
      - name: service
      - name: revision
      - name: event-id
  templates:
    - name: release
      dag:
        tasks:
          - name: validate
            template: validate
          - name: migrate
            dependencies: [validate]
            templateRef:
              name: database-operations
              template: migrate
            arguments:
              parameters:
                - name: service
                  value: '{{workflow.parameters.service}}'
          - name: deploy
            dependencies: [migrate]
            templateRef:
              name: application-deployment
              template: deploy
            arguments:
              parameters:
                - name: service
                  value: '{{workflow.parameters.service}}'
                - name: revision
                  value: '{{workflow.parameters.revision}}'
          - name: verify
            dependencies: [deploy]
            template: verify
    - name: validate
      container:
        image: alpine:3.20
        command: [sh, -c]
        args: ['test -n "{{workflow.parameters.event-id}}"']
    - name: verify
      container:
        image: alpine:3.20
        command: [sh, -c]
        args: ['printf "verify %s\n" "{{workflow.parameters.service}}"']
```

`dependencies` is valid DAG syntax, though the enhanced `depends` expression is preferred when success, failure, skipped, or daemon outcomes need explicit logic. A task listed in `dependencies` must complete successfully for the dependent task to run under the normal DAG behavior.

The Sensor submits only this orchestrator:

```yaml
triggers:
  - template:
      name: submit-release
      conditions: release-request
      argoWorkflow:
        operation: submit
        source:
          resource:
            apiVersion: argoproj.io/v1alpha1
            kind: Workflow
            metadata:
              generateName: release-
            spec:
              workflowTemplateRef:
                name: release-service
              arguments:
                parameters:
                  - name: service
                    value: unset
                  - name: revision
                    value: unset
                  - name: event-id
                    value: unset
        parameters:
          - src:
              dependencyName: release-request
              dataKey: body.service
            dest: spec.arguments.parameters.0.value
          - src:
              dependencyName: release-request
              dataKey: body.revision
            dest: spec.arguments.parameters.1.value
          - src:
              dependencyName: release-request
              dataKey: body.eventId
            dest: spec.arguments.parameters.2.value
```

Now one Workflow status answers whether the release is pending, running, failed, or succeeded.

## Put Retries at the Correct Layer

There are three different retry questions:

1. **Could the Sensor submit the Workflow?** Configure Sensor trigger `retryStrategy` only if duplicate submission is safe, or use `atLeastOnce` with an idempotent design.
2. **Did a workflow task fail transiently?** Configure Argo Workflow `retryStrategy` on that template.
3. **Should the entire business operation be attempted again?** Define a deliberate resubmit or new-operation policy with the same idempotency key.

Retrying trigger submission cannot repair a migration task that failed after the Workflow was created. Retrying a workflow task should not create a second release Workflow.

## Carry Outputs Through the Workflow

Sensor triggers do not naturally pass output from trigger A to trigger B. A Workflow does:

```yaml
- name: discover-version
  template: discover
- name: deploy
  dependencies: [discover-version]
  template: deploy
  arguments:
    parameters:
      - name: version
        value: '{{tasks.discover-version.outputs.parameters.version}}'
```

This is another signal that related actions belong in one workflow graph. Artifact and parameter passing is recorded in Workflow status and follows explicit task dependencies.

## Handle Failure and Compensation Explicitly

Use DAG `depends` expressions for failure branches, or `onExit` for whole-workflow cleanup and notifications. Do not model compensation as a second Sensor trigger that assumes the first trigger failed.

```yaml
dag:
  tasks:
    - name: deploy
      template: deploy
    - name: rollback
      depends: deploy.Failed || deploy.Errored
      template: rollback
```

Compensation is not always rollback. A database migration may be irreversible, in which case the safe response is stop, alert, and roll the application forward. Encode the real failure contract rather than a generic undo step.

## Keep Independent Triggers Independent

Multiple Sensor triggers are appropriate when effects truly do not depend on each other, for example:

- submit a workflow and publish an independent audit event;
- route one source event to separate teams with isolated ownership;
- send best-effort observability data while starting the primary workload.

Even then, understand partial success. One trigger can succeed while another fails. `errorOnFailedRound` can mark the Sensor error after a failed trigger round and stop further processing, but it does not roll back successful side effects. Use it only with an operational recovery plan.

If an audit record is legally required before execution, it is not independent. Make the durable audit write a first workflow task or use a transactional system boundary.

## Enforce Concurrency in the Workflow

A burst of source events can create several orchestrating Workflows. Use a stable idempotency key and, where appropriate, Argo Workflows synchronization or controller parallelism. A mutex keyed by environment or service can serialize critical sections without pretending Sensor trigger order handles concurrency.

Before acting, the Workflow should claim a key such as:

```text
release:{environment}:{service}:{revision}
```

The claim needs an atomic uniqueness guarantee in an authoritative store. Workflow names alone can help if the name is deterministic and Kubernetes creation conflicts are treated correctly, but names have length and character constraints and completion retention affects reuse.

## Test the Failure Boundaries

Verify these cases:

1. delay migration and prove deploy does not start;
2. fail migration and prove the expected failure or compensation branch runs;
3. terminate the Workflow controller and verify recovery after restart;
4. make Sensor submission time out after Kubernetes accepted it and prove no second business release occurs;
5. send duplicate source events and verify the idempotency claim;
6. fail notification or audit tasks and confirm their required or best-effort policy.

Observe Workflow nodes rather than inferring order from Sensor log timestamps:

```bash
argo -n argo-events get @latest
kubectl -n argo-events get workflows
kubectl -n argo-events get workflow release-actual-name -o yaml
```

The `@latest` shorthand is an Argo CLI feature, not a valid Kubernetes object name for `kubectl`; replace `release-actual-name` with the name returned by the list command.

## Official Documentation

- [Argo Events Sensors and triggers](https://argoproj.github.io/argo-events/sensors/more-about-sensors-and-triggers/)
- [Argo Events Argo Workflow trigger](https://argoproj.github.io/argo-events/sensors/triggers/argo-workflow/)
- [Argo Workflows DAGs](https://argo-workflows.readthedocs.io/en/latest/walk-through/dag/)
- [Argo Workflows enhanced depends logic](https://argo-workflows.readthedocs.io/en/latest/enhanced-depends-logic/)
- [Argo Workflows exit handlers](https://argo-workflows.readthedocs.io/en/latest/walk-through/exit-handlers/)
- [Argo Workflows synchronization](https://argo-workflows.readthedocs.io/en/latest/synchronization/)

## Conclusion

Sensor triggers are independent event reactions, not ordered steps. When actions share sequencing, outputs, retries, or compensation, submit one Workflow and encode the relationship in its DAG or steps. Keep multiple triggers only for genuinely independent effects whose partial success you can tolerate and recover.
