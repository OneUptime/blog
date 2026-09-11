# How to Use Buildkite Input in Manual and Scheduled Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Automation, YAML, DevOps

Description: Collect manual Buildkite inputs without blocking scheduled runs, then normalize and validate both paths through shared build metadata.

---

A pipeline that asks a person to choose a test environment works well when started manually. The same input step can leave an overnight scheduled build waiting indefinitely, even if the form has a default value.

Treat manual and scheduled builds as separate input sources that feed one validated contract. Present the form only for interactive runs, supply scheduled values through an explicit configuration path, and make the work depend on input resolution.

## Understand input step dependencies

Buildkite's [input step documentation](https://buildkite.com/docs/pipelines/configure/step-types/input-step) states that input steps do not create implicit dependencies on the surrounding jobs. They prevent the build from completing, but unrelated command steps can still run.

A command that reads input metadata therefore needs an explicit `depends_on`. Visual placement immediately after the input step is not sufficient ordering.

A form's default value preselects or prefills data for a person. It is not an instruction for a scheduled build to automatically submit the form. Avoid relying on form defaults as unattended configuration.

## Show the form only for manual builds

This example supports builds started through the UI and through a schedule:

```yaml
steps:
  - input: "Choose integration test target"
    key: choose-target
    if: build.source == "ui"
    fields:
      - select: "Environment"
        key: requested-target
        default: "staging"
        options:
          - label: "Staging"
            value: "staging"
          - label: "Preview"
            value: "preview"

  - label: "Resolve test target"
    key: resolve-target
    depends_on: choose-target
    command: "bash .buildkite/scripts/resolve-target.sh"
    env:
      SCHEDULED_TEST_TARGET: "staging"

  - label: "Run integration tests"
    key: integration-tests
    depends_on: resolve-target
    command: "bash .buildkite/scripts/run-integration.sh"
```

Buildkite exposes `build.source` to conditions and `BUILDKITE_SOURCE` inside jobs. The documented source for scheduled builds is `schedule`, while manually created UI builds use `ui`.

On a scheduled build the input is skipped, and its dependency is considered satisfied. The resolver then handles the scheduled path. Keep the resolver's source check explicit so another event type does not accidentally acquire a default meant for schedules.

## Normalize both paths in one script

Create `.buildkite/scripts/resolve-target.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

case "${BUILDKITE_SOURCE:-}" in
  ui)
    target=$(buildkite-agent meta-data get requested-target)
    ;;
  schedule)
    target=${SCHEDULED_TEST_TARGET:?Scheduled target is required}
    ;;
  *)
    printf 'Unsupported build source: %s\n' "${BUILDKITE_SOURCE:-unset}" >&2
    exit 1
    ;;
esac

case "$target" in
  staging|preview) ;;
  *)
    printf 'Unsupported test target: %s\n' "$target" >&2
    exit 1
    ;;
esac

buildkite-agent meta-data set effective-test-target "$target"
printf 'Resolved integration target: %s\n' "$target"
```

Both sources write the same `effective-test-target` key only after validation. Downstream scripts do not need to know whether the value came from a form or a schedule.

If API-triggered builds are required later, add a separate `api` branch that requires an explicit input field or environment value. Do the same for webhook and trigger-step sources. Do not broaden the fallback to accept every unknown source as a scheduled run.

## Consume the normalized contract

The integration entry point can use:

```bash
#!/usr/bin/env bash
set -euo pipefail

export TEST_TARGET
TEST_TARGET=$(buildkite-agent meta-data get effective-test-target)
./scripts/integration-tests.sh
```

The repository's test script reads `TEST_TARGET` and selects the correct endpoint or fixture environment. Keep credential retrieval separate; build input fields and metadata are visible to users with build access and are unsuitable for secrets.

A missing effective key should fail. Falling back to staging in the consumer would hide a failed or skipped resolver and make the pipeline's actual decision harder to trace.

## Keep schedule configuration visible

The example fixes scheduled runs to staging in the resolver step's environment. If different schedules need different values, move that value into your schedule configuration and remove the conflicting step-level default. Confirm the resulting job environment in a test run.

Buildkite schedules are configured through the pipeline's schedule settings or APIs, not a generic `cron` key added to arbitrary pipeline YAML. The [schedule guide](https://buildkite.com/docs/pipelines/configure/workflows/scheduled-builds) documents timezone and interval behavior.

Record the branch and commit policy of the schedule alongside the target. An unattended run testing an unexpected branch can be more misleading than a wrong environment name.

## Avoid duplicate input ownership

Input fields store values as build metadata. Choose field keys distinct from normalized output keys, as the example does. This preserves the original request while making the validated decision clear.

If a pipeline generator uploads input steps dynamically, make sure the consumers depend on those specific step keys. A generator should not upload a second form with the same keys on retry. Keep the generation path deterministic and test retries explicitly.

For release approvals, decide whether an input form is the right control or whether a block step and permission restrictions better express the workflow. A selectable target alone does not constitute deployment authorization.

## Verify both entry paths

Start one UI build and confirm the resolver waits for submission. Select each allowed target and verify the downstream script receives it. Then trigger the actual configured schedule and confirm no input remains pending.

Test a missing scheduled value and an unsupported source. They should fail in the resolver with a useful message, before any integration or deployment command starts.

## Conclusion

Make the form conditional on an interactive source, resolve scheduled inputs explicitly, and pass both through one validation step. Dependencies and normalized metadata keep unattended runs predictable without weakening manual controls.

## Official Documentation

- [Input steps](https://buildkite.com/docs/pipelines/configure/step-types/input-step)
- [Build source conditions](https://buildkite.com/docs/pipelines/configure/conditionals)
- [Scheduled builds](https://buildkite.com/docs/pipelines/configure/workflows/scheduled-builds)
- [Build metadata](https://buildkite.com/docs/pipelines/configure/build-meta-data)
