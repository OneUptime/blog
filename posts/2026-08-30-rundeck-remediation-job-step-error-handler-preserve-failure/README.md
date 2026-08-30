# How to Call a Remediation Job from a Rundeck Step Error Handler Without Hiding the Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rundeck, Automation, Troubleshooting, Job Scheduling

Description: Run a reusable remediation job from a Rundeck error handler while preserving the original workflow failure for alerts, retries, and audit history.

---

Rundeck error handlers have an important semantic that is easy to miss: the handler's result becomes the result of the step it handled. If the original step fails but its error handler succeeds, Rundeck considers the step recovered. The final workflow status also depends on the workflow's **Run remaining steps before failing** setting and the handler's **Keep going on success** setting.

That is useful when remediation genuinely restores the intended outcome. It is dangerous when the handler merely gathers diagnostics, opens a ticket, rolls back a partial change, or puts the service into a safe state. In those cases, a green parent execution hides the failure that operators and monitoring need to see.

## Understand the Status Flow

An error handler is one secondary step attached to a workflow step. It can be a command, script, plugin step, or Job Reference. It runs only when the primary step fails.

The relevant outcomes are:

| Primary step | Error handler | Result of handled step | Workflow effect |
| --- | --- | --- | --- |
| Succeeds | Not run | Succeeded | Continues normally |
| Fails | Fails | Failed | Follows the workflow's failure behavior and finishes failed |
| Fails | Succeeds | Succeeded | Depends on the two continuation settings described below |

When the handler succeeds and both **Run remaining steps before failing** and **Keep going on success** are disabled, Rundeck marks the handled step successful, stops the remaining steps, and still marks the workflow execution failed. If either setting is enabled, Rundeck does not mark the workflow failed and continues to the next step. **Keep going on success** therefore affects both continuation and whether the failure is recovered; it does not turn a successful handler back into a failed step.

Those combinations can be useful, but they are easy to change accidentally during later workflow editing. If the handled step itself must unambiguously remain failed, make the handler finish unsuccessfully.

## Separate Remediation from Failure Preservation

Create two jobs rather than making the real remediation job fail deliberately:

1. `Remediate deployment` performs rollback, isolation, or recovery and reports its real result.
2. `Handle failed deployment` calls that remediation job, records the outcome, and then deliberately returns a non-zero exit code so the original step remains failed.

This separation lets operators run and test the remediation job directly without every healthy remediation execution appearing red.

A simplified wrapper job exported as YAML can look like this:

```yaml
- name: Handle failed deployment
  group: remediation
  description: Run remediation and preserve the triggering failure.
  loglevel: INFO
  sequence:
    keepgoing: true
    strategy: node-first
    commands:
      - description: Run the reusable remediation
        jobref:
          group: remediation
          name: Remediate deployment
          args: >-
            -parent_execution ${option.parent_execution}
            -failure_reason ${option.failure_reason}
      - description: Preserve the original failed status
        script: |-
          #!/usr/bin/env bash
          echo "Remediation handler finished; preserving the triggering failure." >&2
          exit 1
  options:
    - name: parent_execution
      required: true
    - name: failure_reason
      required: false
```

`keepgoing: true` is intentional in this wrapper: it ensures the final failure marker runs even if the remediation job itself fails. If remediation fails, both that child execution and the wrapper remain visibly failed. If remediation succeeds, the final step still preserves the parent failure.

Keep this wrapper configured to **Execute locally** so its final marker does not depend on a remote node filter or node availability. The inline Bash step is a Linux-server example; use an equivalent local command that reliably returns non-zero on the Rundeck server's operating system.

## Attach the Wrapper as the Error Handler

In the parent job, open the failing step's settings, add an Error Handler, and select **Job Reference**. Point it at `remediation/Handle failed deployment` and pass stable context values:

```text
-parent_execution ${job.execid} -failure_reason ${result.reason}
```

Rundeck exposes error-handler context such as:

- `${result.reason}` for a machine-oriented reason such as `NonZeroResultCode`, `JobFailed`, or `NodeDispatchFailure`.
- `${result.message}` for a human-readable description.
- `${result.resultCode}` when an exit code is available.
- `${result.failedNodes}` for failed node names in relevant node-dispatch failures.

Prefer the execution ID and reason code in Job Reference arguments. Messages can contain whitespace or shell-sensitive characters, so do not interpolate `${result.message}` into a shell command without a safe transport and explicit encoding. The remediation job can use the parent execution ID to retrieve richer details through an approved integration if necessary.

Leave **Keep going on success** disabled unless the design explicitly allows later parent steps to run after a successful recovery. In this preserve-failure pattern the wrapper fails, so that handler-only setting is not what preserves the failure; the wrapper's non-zero result is.

## Choose the Right Error-Handler Scope

A Workflow Step runs once per job, while a Node Step runs for each selected node. That distinction affects remediation:

- Use a workflow-level Job Reference to perform one cluster-wide rollback or incident action.
- Use a node-level handler only when remediation must occur independently on every failed node.
- With a sequential strategy, a failure can stop dispatch to remaining nodes unless **Continue running on any remaining nodes before failing the step** is enabled.

There is also a strategy constraint: in a Node First workflow, a Node Step can have only another Node Step as its error handler. A Job Reference used there must operate as a Node Step and can launch once per failed node. To run the wrapper once for the whole job, attach it where a Workflow Step handler is permitted; the Sequential strategy allows a workflow handler to roll up node failures.

Do not accidentally launch the same global remediation once per failed node. If a node handler must report several failures to one global job, aggregate the failed nodes first or make the remediation idempotent and protected against concurrent calls.

## Decide When Success Is Actually Correct

Preserving failure is not always the right choice. Let the error handler succeed when it fully establishes the original postcondition. For example, a deployment step that fails over to a verified secondary deployment path may legitimately be recovered.

Keep the parent failed when remediation only:

- rolls back to the previous version;
- quarantines a host;
- collects diagnostics;
- pages an operator;
- creates a ticket; or
- reduces impact without completing the requested change.

Test all three paths before production: primary success, primary failure plus remediation success, and failure of both the primary action and remediation. Verify the parent execution status, child execution status, notifications, and any retry policy.

## Official Documentation

- [Rundeck Job Workflows: Error Handlers](https://docs.rundeck.com/docs/manual/jobs/job-workflows.html#error-handlers)
- [Rundeck Job Variables Reference](https://docs.rundeck.com/docs/manual/jobs/job-variables.html#error-handler-context-variables)
- [Rundeck built-in Node Steps: Job Reference](https://docs.rundeck.com/docs/manual/jobs/job-plugins/node-steps/builtin.html#job-reference-step)
- [Rundeck Job YAML format: Error Handler](https://docs.rundeck.com/docs/manual/document-format-reference/job-yaml-v12.html#error-handler)

## Conclusion

A successful Rundeck error handler makes the handled step successful, although the workflow's two continuation settings still determine the final workflow behavior. When remediation must run but the triggering step must remain failed, call a normal remediation job through a small wrapper that always ends non-zero. That preserves accurate alerts and audit history without corrupting the reusable remediation job's own success status.
