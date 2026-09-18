# Diagnose Buildkite Manual Retries Immediately Canceled by Fast Fail

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Troubleshooting, Testing, DevOps

Description: Identify build-wide fast-fail cancellation during manual retries and choose a retry sequence that preserves meaningful failure signals.

---

You click Retry on a canceled test job, a new attempt appears, and it is canceled before useful work begins. Adding agents or increasing the command timeout does not help because the scheduler is responding to the state of the build.

Check `cancel_on_build_failing` and the other failing jobs first. A retried job can still be subject to the same build-wide failure policy as its original attempt.

## Understand what fast fail watches

The command-step attribute is simple:

```yaml
steps:
  - label: "Unit tests"
    key: unit
    command: "./scripts/unit-tests.sh"
    cancel_on_build_failing: true

  - label: "Integration tests"
    key: integration
    command: "./scripts/integration-tests.sh"
    cancel_on_build_failing: true
```

If either command hard-fails, the build enters a failing state. Other jobs carrying the attribute can be canceled, whether running or still waiting. The [command-step reference](https://buildkite.com/docs/pipelines/configure/step-types/command-step) also explains that a promised hard failure can move the build into failing before the declaring job exits.

A Retry button permits another attempt. It does not promise that all the build's other scheduling rules are suspended. This is especially relevant when several shards failed and only one was retried.

## Build a timeline before changing configuration

Open the canceled attempt and locate the last event before cancellation. Then inspect the whole build, including jobs outside the visible group. Record:

- The original failure and its finish time.
- The new retry attempt's job ID and creation time.
- Whether another hard failure remains unresolved.
- Whether any running job has promised a failure.
- The cancellation event and its recorded reason.

Compare the generated step definition with the source YAML. A shared template, generator, or plugin-provided command step may enable fast fail even when the repository's visible test definition does not.

The [Jobs API](https://buildkite.com/docs/apis/rest-api/jobs) returns individual job details and exposes promised failure information. Use it to inspect large builds without relying on a screenshot of one job group. Do not dump the job environment as a routine diagnostic; the job identity and lifecycle usually provide the evidence you need.

## Distinguish three cancellation causes

Fast fail is only one possible explanation. A user may have canceled the whole build, or pipeline settings may automatically cancel superseded builds. A retry inside a build being canceled is a different recovery problem from retrying a failed test in an otherwise active build.

Agent shutdown is different again. Its log often identifies the agent lifecycle or infrastructure termination. A command canceled almost instantly with no checkout does not prove the agent died; the job may have been stopped before dispatch.

Use the recorded events to choose the branch of the investigation. Replacing a healthy agent because a fast-fail rule canceled its job leaves the original problem untouched.

## Retry the source failures first

When one failed job caused siblings to be canceled, retry that source failure and inspect its result before repeatedly retrying the siblings. If several independent failures remain, resolve or retry those together as appropriate for the build's recovery controls.

Once the build is no longer actively failing from another job, rerun the canceled work. If selective recovery remains confusing, create a fresh build of the same immutable commit. That produces a clean scheduling graph and an unambiguous comparison point.

Be careful with side effects. A fresh build may repeat packaging, publishing, or deployment steps. Use a test-only recovery pipeline or gate those operations if replaying them is not safe. This is a property of your pipeline design, not a reason to automatically make every test retryable indefinitely.

## Exempt jobs that should collect evidence

Report generation often needs to survive test failures:

```yaml
steps:
  - label: "Tests"
    key: tests
    command: "./scripts/tests.sh"
    cancel_on_build_failing: true

  - label: "Collect diagnostics"
    key: diagnostics
    depends_on: tests
    allow_dependency_failure: true
    cancel_on_build_failing: false
    command: "./scripts/collect-diagnostics.sh"
```

This lets a failed test feed a diagnostic step without making that step a fast-fail target. It does not guarantee execution after a canceled dependency or canceled build; the [dependency guide](https://buildkite.com/docs/pipelines/configure/depends-on) describes that boundary.

Do not change hard test failures to `soft_fail` merely to keep the build green during recovery. That changes the quality gate. Disable fast fail on a particular job when completing that job is more valuable than saving its remaining compute time.

## Verify with a small failing pipeline

Use two harmless test commands in a disposable pipeline: one exits nonzero, and the other runs long enough to observe cancellation. Confirm fast fail is the cause, then repeat the recovery sequence with the failing command resolved.

Test the diagnostic exception separately and check its dependency behavior. Keep manual retries enabled only where repeating work makes sense; the [retry reference](https://buildkite.com/docs/pipelines/configure/retry) provides controls for passed jobs and jobs that should never be rerun.

A useful recovery policy addresses the build's current failure state, preserves real test failures, and leaves enough diagnostics to explain why a retry was canceled.
