# Fail Fast or Run Every Check? Designing Useful Parallel CI Gates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, Test Automation, GitHub Action, Quality Gates, Developer Experience

Description: Combine early deterministic gates with complete parallel diagnostics so CI blocks bad changes quickly without hiding independent failures.

---

"Fail fast" and "run every check" solve different problems. Fail fast minimizes wasted work after a decisive failure. Running all checks maximizes the diagnostic information returned for one commit.

A useful pipeline applies the choice at the right layer. It does not use one global setting for every job.

## Distinguish Four Failure Boundaries

Failure control can apply to:

1. commands inside a step;
2. steps inside one job;
3. members of a matrix;
4. independent jobs or complete workflow runs.

For example, a shell step should normally stop when compilation fails; running packaging commands on missing output adds noise. Independent lint and unit-test jobs can still complete concurrently and report both problems.

GitHub's matrix `strategy.fail-fast` concerns matrix members. When true, a non-tolerated failure cancels queued and in-progress members of that matrix. It does not mean every unrelated workflow job is immediately canceled.

```yaml
jobs:
  compatibility:
    strategy:
      fail-fast: false
      matrix:
        runtime: [20, 22, 24]
    runs-on: ubuntu-latest
    steps:
      - run: ./scripts/test-runtime '${{ matrix.runtime }}'
```

Use `fail-fast: false` when knowing the result for every supported platform is worth the compute. Use `true` when members are equivalent shards and one deterministic product failure already proves the commit cannot pass.

## Put Cheap, High-Signal Checks Early

Good early gates are:

- configuration syntax;
- generated-file consistency;
- formatting or fast lint rules;
- compilation or type checking;
- dependency-lock validation;
- a focused smoke test.

They should be deterministic, fast, and likely to invalidate expensive downstream work. Express a real dependency so integration or end-to-end jobs wait for the prerequisite:

```yaml
jobs:
  preflight:
    # fast checks

  integration:
    needs: preflight
    # expensive checks
```

Do not place every source-only check behind preflight. If lint takes two minutes and can run safely beside compilation, starting both gives more feedback without lengthening the critical path.

## Run Independent Diagnostics in Parallel

Suppose a pull request has a type error and a broken migration. If type checking cancels the migration validator, the author fixes one issue, pushes again, and waits to discover the second.

A balanced pull-request pipeline often does this:

- start lint, unit tests, and static security analysis together;
- gate expensive integration tests on successful build/preflight;
- let distinct supported-platform jobs finish;
- stop truly redundant shards after a decisive failure;
- collect reports from all work that actually ran.

This yields a "diagnostic batch" without spending on work that cannot produce meaningful output.

## Treat Shards Differently from Compatibility Rows

Test shards divide one logical suite. A failure in shard 1 does not reveal whether shard 4 also has a distinct regression, but the additional detail may or may not be worth the cost.

Compatibility rows answer separate product questions: does it work on each supported OS or runtime? Canceling Windows after Linux fails can conceal a Windows-only problem. For a release candidate, complete coverage is usually more valuable.

Use historical data:

- failure correlation between matrix members;
- average remaining duration at first failure;
- retry and flake rate;
- cost per additional diagnosis;
- developer wait time saved by complete results.

These are engineering tradeoffs, not guarantees of a CI platform.

## Model Allowed Failures Explicitly

An experimental runtime may be informative but not release-blocking:

```yaml
continue-on-error: ${{ matrix.experimental }}
strategy:
  fail-fast: true
  matrix:
    runtime: [20, 22]
    experimental: [false]
    include:
      - runtime: 24
        experimental: true
```

GitHub documents that a failure in a `continue-on-error: true` matrix job does not trigger fail-fast cancellation of required rows. Keep tolerated jobs visibly separate in reporting. A permanently ignored red job trains people to disregard the dashboard; it needs an owner, expiry, and promotion criteria.

Do not use `continue-on-error` merely to make an unstable required test green. Track flakes separately and preserve their failure signal.

## Build One Stable Required Gate

Branch protection needs a clear answer even when the internal matrix changes. A final gate can depend on required jobs and evaluate their results:

```yaml
gate:
  if: ${{ !cancelled() }}
  needs: [lint, unit, integration]
  runs-on: ubuntu-latest
  steps:
    - name: Require every dependency
      env:
        LINT_RESULT: ${{ needs.lint.result }}
        UNIT_RESULT: ${{ needs.unit.result }}
        INTEGRATION_RESULT: ${{ needs.integration.result }}
      run: |
        test "$LINT_RESULT" = success
        test "$UNIT_RESULT" = success
        test "$INTEGRATION_RESULT" = success
```

The gate must fail if any required dependency failed or was unexpectedly skipped. Do not assume a skipped job will block merging. GitHub reports a conditionally skipped job as success, while an entire required workflow skipped by path or branch filtering can remain expected/pending. Design required checks so they always report for relevant pull requests.

If a merge queue is enabled, GitHub workflows that provide required checks also need the `merge_group` trigger.

## Preserve Cleanup Without Defeating Cancellation

Logs, test reports, and temporary-environment cleanup should run after failures. But unconditional work needs care.

GitHub recommends using `always()` primarily at step level or for work expected even on cancellation. A job or step that checks out source or contacts an unavailable service under `always()` can hang. Prefer:

- `failure()` for failure diagnostics;
- `!cancelled()` for aggregation that should not run after cancellation;
- `cancelled()` for narrowly scoped cancellation cleanup;
- timeouts and exact resource identifiers for cleanup.

Deployment must keep the normal success condition. A reporting condition should never accidentally override it.

## Use Two Feedback Modes

A practical design separates:

### Pull-request feedback

Optimize for quick, broad developer information. Run cheap independent checks in parallel, complete a useful set of compatibility results, and postpone the most expensive suites when preflight fails.

### Mainline or release qualification

Optimize for confidence. Run the full supported matrix, security scans, migration tests, and end-to-end suites. Avoid fail-fast where a complete compatibility record is part of the release decision.

Nightly runs are not a substitute for pull-request correctness, but they can cover very expensive low-frequency matrices.

## Review the Policy Regularly

Instrument:

- time to first actionable failure;
- time to complete all diagnostics;
- canceled runner minutes;
- number of pushes needed before green;
- failures hidden until a later rerun;
- failure and flake rates per job.

If fail-fast rarely saves time but often hides a second failure, disable it. If every matrix row fails identically within seconds and consumes hours, add an earlier shared gate or enable cancellation.

The best default is selective: fail a command when its prerequisite fails, cancel redundant work after a decisive gate, and let independent high-value checks return a complete diagnostic set.

## Official Documentation

- [GitHub Actions matrix failure handling](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations)
- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub Actions expressions and status functions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions)
- [GitHub status checks](https://docs.github.com/en/pull-requests/reference/status-checks)
- [Troubleshooting required GitHub status checks](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/troubleshooting-required-status-checks)
- [GitLab pipeline efficiency](https://docs.gitlab.com/ci/pipelines/pipeline_efficiency/)
