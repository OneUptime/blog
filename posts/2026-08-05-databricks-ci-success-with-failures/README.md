# Make Databricks CI Reject SUCCESS_WITH_FAILURES

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Lakeflow Jobs, CI/CD, Workflow Orchestration, Monitoring, Reliability, DevOps

Description: Inspect the exact Databricks job termination code and design a strict leaf gate so failed tasks cannot ship behind a green workflow.

---

A Databricks multi-task job can finish as `SUCCESS_WITH_FAILURES` when an intermediate task fails but every leaf task succeeds. The run is green enough for Databricks success notifications, yet it contains a real failed task.

That state is useful for workflows that deliberately clean up or report after failure. It is dangerous when CI treats any successful parent run as permission to release data or application code.

Use two defenses:

1. CI must inspect the structured run result and accept only exact `SUCCESS`.
2. The job DAG should end in a strict leaf task that fails when any critical task did not succeed.

Either control catches mistakes. Together they protect both externally triggered CI runs and scheduled or manually launched runs.

## Why the Parent Run Looks Successful

Databricks determines a job's status from leaf tasks, meaning tasks with no downstream dependencies:

```text
extract (fails)
   |
   v
cleanup (runs after all done, succeeds, and is the only leaf)
```

Some tasks failed, but the only leaf succeeded. Databricks classifies the parent run as `Succeeded with failures` rather than `Failed`.

The official rules are:

- `Succeeded`: all tasks succeeded.
- `Succeeded with failures`: at least one task failed, but every leaf task succeeded.
- `Failed`: at least one leaf task failed.

This often appears after adding an `ALL_DONE` cleanup, audit, metrics, or notification task. The operational task is now the leaf, so its success controls the parent result.

## Success Notifications Include This State

Job-level notification semantics follow the same classification. Databricks documents that a run completed as `Succeeded with failures` is considered successful for notifications. It sends `jobs.on_success`, not `jobs.on_failure`.

Therefore these signals are insufficient for a strict release gate:

- receipt of a job success webhook;
- absence of a job failure email;
- a green-looking parent status category;
- successful completion of a CLI waiter;
- success of the cleanup or reporting task.

Use task-level failure notifications for operational visibility, but make CI query the terminal result itself.

## Read the Exact Termination Code

Current Jobs API responses expose the precise reason at:

```text
.status.termination_details.code
```

Relevant values include `SUCCESS` and `SUCCESS_WITH_FAILURES`. The older result shape exposes:

```text
.state.result_state
```

When supporting workspaces or tooling that still returns the older shape, prefer the current code and use the legacy value only as a fallback. Fail closed if neither is present or if a new unknown value appears.

Do not check only `status.termination_details.type`. That field is a broad category, while `code` carries the specific termination reason CI needs.

## Trigger, Wait, and Enforce Exact Success

The Databricks CLI can start a job without waiting and return its run ID. CI can then poll `jobs get-run` and inspect the final JSON:

```bash
set -euo pipefail

trigger_json="$(databricks jobs run-now "${JOB_ID}" --no-wait -o json)"
run_id="$(jq -er '.run_id' <<<"${trigger_json}")"

while true; do
  run_json="$(databricks jobs get-run "${run_id}" -o json)"
  lifecycle="$(jq -r '.status.state // .state.life_cycle_state // "UNKNOWN"' \
    <<<"${run_json}")"

  case "${lifecycle}" in
    TERMINATED|SKIPPED)
      break
      ;;
  esac

  sleep 10
done

result="$(jq -r \
  '.status.termination_details.code // .state.result_state // "UNKNOWN"' \
  <<<"${run_json}")"

if [[ "${result}" != "SUCCESS" ]]; then
  echo "Databricks run ${run_id} rejected with result ${result}" >&2
  jq -r '
    .tasks[]?
    | [
        .task_key,
        (.status.termination_details.code // .state.result_state // "UNKNOWN")
      ]
    | @tsv
  ' <<<"${run_json}" >&2
  exit 1
fi

echo "Databricks run ${run_id} completed with exact SUCCESS"
```

This policy rejects `SUCCESS_WITH_FAILURES`, `FAILED`, `TIMEDOUT`, `CANCELED`, `SKIPPED`, and unknown future states. It also emits task states for diagnosis.

Use an idempotency token when a CI retry could trigger a second copy of the same run:

```bash
databricks jobs run-now "${JOB_ID}" \
  --idempotency-token "${RELEASE_ID}" \
  --no-wait \
  -o json
```

The CLI's default waiter has a finite timeout. Explicit polling lets CI set its own deadline, emit progress, and cancel or investigate a run that never reaches a terminal state. Add a wall-clock limit to the production script so a stuck run does not occupy a runner forever.

For jobs with more than 100 tasks, `get-run` paginates task arrays. The parent termination code is still at the response root, but a complete task diagnostic must follow `next_page_token`.

## Unit-Test the Gate With Fixtures

Treat the JSON parser as release code. Test both response shapes and every terminal policy outcome:

```json
{
  "status": {
    "state": "TERMINATED",
    "termination_details": {
      "code": "SUCCESS_WITH_FAILURES",
      "type": "SUCCESS"
    }
  }
}
```

```json
{
  "state": {
    "life_cycle_state": "TERMINATED",
    "result_state": "SUCCESS_WITH_FAILURES"
  }
}
```

Both fixtures must produce a nonzero CI result. Also test exact `SUCCESS`, a missing code, an unknown code, invalid JSON, CLI failure, pagination, and timeout behavior.

Pin and periodically upgrade the Databricks CLI version. API fields can evolve, and a permissive parser that maps missing state to success defeats the control.

## Make a Strict Validation Task the Final Leaf

External CI protects releases launched through that path. The job DAG itself should also represent the policy so schedules, manual runs, and Run Job tasks behave correctly.

Add a final task that:

- depends on every critical branch and cleanup task;
- uses `run_if: ALL_DONE` so it executes after failures;
- receives each critical task's dynamic result-state reference;
- fails unless every required result is allowed;
- remains a leaf task.

An illustrative bundle fragment is:

```yaml
resources:
  jobs:
    publish_orders:
      name: publish-orders
      tasks:
        - task_key: extract
          notebook_task:
            notebook_path: ../src/extract.py

        - task_key: publish
          depends_on:
            - task_key: extract
          notebook_task:
            notebook_path: ../src/publish.py

        - task_key: cleanup
          depends_on:
            - task_key: extract
            - task_key: publish
          run_if: ALL_DONE
          notebook_task:
            notebook_path: ../src/cleanup.py

        - task_key: strict_result_gate
          depends_on:
            - task_key: extract
            - task_key: publish
            - task_key: cleanup
          run_if: ALL_DONE
          notebook_task:
            notebook_path: ../src/strict_result_gate.py
            base_parameters:
              extract_state: "{{tasks.extract.result_state}}"
              publish_state: "{{tasks.publish.result_state}}"
              cleanup_state: "{{tasks.cleanup.result_state}}"
```

The gate notebook should raise an exception for a disallowed state:

Dynamic task result values are lowercase, such as `success`, `failed`, and
`excluded`. They are separate from the uppercase root run termination codes
returned by the Jobs API.

```python
required_states = {
    "extract": dbutils.widgets.get("extract_state"),
    "publish": dbutils.widgets.get("publish_state"),
    "cleanup": dbutils.widgets.get("cleanup_state"),
}

bad_states = {
    task: state
    for task, state in required_states.items()
    if state != "success"
}

if bad_states:
    raise RuntimeError(f"Critical task states rejected: {bad_states}")
```

Verify the current dynamic value reference names in the job UI or documentation and inspect resolved parameters in a test run. Do not use a silent fallback when a reference is mistyped.

Most importantly, do not add a successful reporting task downstream of `strict_result_gate`. That would make the reporter the new leaf and recreate the original problem. Send notifications from the gate, use task-level notifications, or make any downstream terminal task preserve failure.

## Design Cleanup Without Masking the Failure

Cleanup often must run regardless of upstream outcome. Keep it, but separate operational completion from release correctness:

```text
critical branches ----> cleanup ------>
        |                              strict leaf gate
        +----------------------------->
```

The strict gate waits for both critical work and cleanup. If cleanup itself is critical, require its exact success too. If cleanup fails after all business tasks succeed, the gate should fail the parent because leaked temporary data or locks can be a release problem.

For cleanup that must be attempted but is not release-critical, record its outcome and make the exception an explicit policy. Avoid a blanket rule that accepts every `SUCCESS_WITH_FAILURES`; it cannot distinguish an expected cleanup warning from a missing published table.

## Model Expected Outcomes Without Failed Tasks

Some workflows intentionally probe for a condition that might be false. Do not represent an expected business outcome as an exception if strict CI will treat every failed task as a broken release.

Prefer:

- a condition task that routes on an explicit value;
- task values that report `matched=false` while the task succeeds;
- an empty-input branch with a successful no-op result;
- an explicit allowlist evaluated by the final gate.

Reserve a failed task state for conditions that should require attention. This makes parent run semantics and alerting more meaningful.

If a task is genuinely optional, document why, identify the allowed non-success states, and test that no downstream data contract depends on it. The external CI policy can still reject parent `SUCCESS_WITH_FAILURES`; redesign the optional task to communicate an expected result without failing.

## Repair Runs Need the Same Check

Repairing failed tasks updates the original run's history. CI must inspect the terminal state after the latest repair rather than trusting that the repair command returned successfully. Use `get-run --include-history` for audit evidence and apply the same exact-success policy to the current root result.

Do not let a repair run publish an artifact built from a different job definition without recording the deployed bundle revision and resolved parameters. A repair uses current job and task settings, so release evidence should identify both original and repair context.

## Improve Operational Visibility

Configure task-level failure notifications on critical tasks because job-level failure notification does not fire for `SUCCESS_WITH_FAILURES`. Also record:

- parent termination code and message;
- every task's current result;
- run ID, job ID, and run-page URL;
- attempt and repair history;
- deployed bundle or Git revision;
- resolved release parameters;
- CI decision and policy version.

The notification system treats `SUCCESS_WITH_FAILURES` as success by design. A custom webhook consumer can inspect the run by ID after `jobs.on_success`, but it should use the same exact-code parser as CI.

## A Strict Release Checklist

Before shipping from a Databricks workflow:

1. Trigger with an idempotency token.
2. Wait for a terminal API state with a bounded timeout.
3. Read `status.termination_details.code`, with deliberate legacy fallback if required.
4. Accept only exact `SUCCESS`.
5. Fail closed on missing or unknown values.
6. Emit all failed or skipped task states.
7. Keep a strict validation task as the final DAG leaf.
8. Use task-level failure notifications.
9. Test the gate with `SUCCESS_WITH_FAILURES` fixtures.
10. Store run and release identifiers with the artifact being promoted.

## Official Documentation

- [Monitor Lakeflow Jobs](https://docs.databricks.com/aws/en/jobs/monitor)
- [Add notifications on a job](https://docs.databricks.com/aws/en/jobs/notifications)
- [Databricks CLI `jobs` commands](https://docs.databricks.com/aws/en/dev-tools/cli/reference/jobs-commands)
- [Jobs API: get a run](https://docs.databricks.com/api/workspace/jobs_21/getrun)
- [Databricks SDK Jobs result and termination models](https://databricks-sdk-py.readthedocs.io/en/latest/dbdataclasses/jobs.html)
- [Configure task run conditions](https://docs.databricks.com/aws/en/jobs/run-if)
- [Use dynamic value references](https://docs.databricks.com/aws/en/jobs/dynamic-value-references)

## Conclusion

`SUCCESS_WITH_FAILURES` is not an API bug. It is the documented outcome when failures occur away from successful leaf tasks, and Databricks intentionally treats it as success for notifications. A release pipeline should use a stricter contract: accept only the exact `SUCCESS` termination code, fail closed on every other value, and make a validating task the final leaf of the job DAG.
