# How to Balance Pytest Shards Across Buildkite Parallel Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, Pytest, Python, Testing, CI/CD

Description: Use Buildkite Test Engine timing data to balance pytest work, preserve test selectors, and diagnose slow shards.

---

Setting `parallelism: 8` creates eight Buildkite jobs; it does not automatically divide a plain `pytest` command into eight different subsets. Without a sharding layer, every job can run the entire suite.

Use the Test Engine Client, `bktec`, to select work for each parallel job and balance it with historical timing data. Then measure the slowest shard, because it determines when the parallel stage finishes.

## Start with the Tests plugin

Assume Python, pytest, and the repository's test dependencies are installed in the agent image or prepared by your normal setup process:

```yaml
steps:
  - label: "pytest %n"
    key: python-tests
    command: "bktec run"
    parallelism: 4
    plugins:
      - tests#v1.0.0:
          test-runner: pytest
          suite-slug: application-python
          test-file-pattern: "tests/**/{*_test,test_*}.py"
          upload-results: true
```

The plugin installs the client when it is absent and configures it, while the command actually runs it. Version 1.0.0 [reuses an existing `bktec` on `PATH`](https://github.com/buildkite-plugins/tests-buildkite-plugin/blob/v1.0.0/hooks/pre-command), so ensure that client is current and at least v2.7.0 for built-in result uploads. It uses Buildkite's parallel-job context to obtain the work assigned to each shard. The [Tests plugin documentation](https://github.com/buildkite-plugins/tests-buildkite-plugin) describes setup, suite naming, OIDC authentication, and options.

Keep the suite slug stable. Moving identical tests between unrelated suite identities fragments the timing history the planner needs. Ensure the pipeline is permitted to access or create the intended suite under your organization's policies.

The plugin does not install your application dependencies. A shard that fails during import has not produced useful timing data for balancing.

## Choose one upload method

The example uses bktec's built-in uploads. If a language-specific collector already uploads your pytest results, set the plugin's `upload-results: false` and keep that collector responsible for ingestion.

Do not enable both for the same executions. Duplicate results distort counts and can make performance investigations misleading. Buildkite's [client installation guide](https://buildkite.com/docs/pipelines/configure/tests/bktec/installing-and-using-the-client) explains the available upload paths.

Current bktec can use pytest's JUnit output when the Python collector is absent. The collector provides richer integration and additional features. If using it with selector-based splitting, follow the client documentation's version guidance so selectors match recorded test history reliably.

## Preserve the assigned selectors

When customizing the pytest command, retain the placeholder for the selected tests and a supported result output flag. For a JUnit-based setup:

```yaml
steps:
  - label: "pytest with duration diagnostics %n"
    command: "bktec run"
    parallelism: 4
    plugins:
      - tests#v1.0.0:
          test-runner: pytest
          suite-slug: application-python
          test-cmd: "pytest --durations=10 --junit-xml={{resultPath}} {{testExamples}}"
          upload-results: true
```

`{{testExamples}}` is substituted by bktec with the assigned selectors. Removing it can cause every shard to run the full suite. `{{resultPath}}` is the client-managed output path used to inspect results.

The [bktec pytest guide](https://github.com/buildkite/test-engine-client/blob/main/docs/pytest.md) documents these placeholders and how it selects the result parser. Include one supported format flag rather than asking the client to guess between unrelated output files.

## Understand cold history and slow files

Timing-based balancing improves when selectors match historical executions. New tests, renamed paths, a changed location prefix, or a new suite can force the planner to use estimates instead of observed durations.

Current pytest selector discovery commonly uses test file paths. One very slow file can remain a bottleneck even when all other files are perfectly balanced. Inspect your pinned client's supported granularity before assuming each individual parameterized case can be distributed independently.

Split an oversized module into coherent smaller modules when that helps parallelism and maintainability. Consider fixture cost: splitting a file may repeat an expensive module or session setup, so a more even distribution can still increase total work.

Use pytest's [duration and collection diagnostics](https://docs.pytest.org/en/stable/how-to/usage.html) to distinguish a slow test body from expensive setup or collection. Keep this diagnosis separate from the planner's assignment history.

## Avoid accidental nested overload

Four Buildkite shards each running eight pytest-xdist workers can create 32 test processes. That may be intentional, but it can exhaust CPUs, database connections, memory, or a shared external service.

Start with one level of parallelism and establish resource demand per shard. If using nested workers, size the agent and test dependencies for the combined concurrency. A noisy neighbor can make one shard look poorly balanced when the real issue is resource contention.

Use unique temporary database names, ports, and result paths where jobs share infrastructure. A deterministic shard assignment does not isolate external state automatically.

## Measure the right improvement

Compare the sum of test execution time, the slowest shard's runtime, setup overhead, and queue wait. Doubling shard count may reduce test execution while increasing environment setup and waiting for agents.

Check that the union of selected tests equals the intended suite, without unintended overlaps. Run a sample with one deliberately slow module and verify its history affects later plans. Then rename a test path and observe the fallback behavior.

Keep retries visible when comparing performance; retries add real work even if the final job passes. A balanced pipeline finishes sooner because work is distributed intelligently, while still running the intended tests exactly as the test contract requires.
