# How to Fan Out Drone Test Shards and Fan In Coverage and Test Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, Testing, CI/CD, Python, Code Coverage

Description: Run Drone test shards in parallel, preserve isolated coverage and JUnit files, and aggregate reports while retaining real test failures.

Parallel tests are useful only if their results remain complete and their failures remain visible. In Drone, choose whether shards are parallel steps in one pipeline or separate pipelines before designing aggregation. That choice determines whether the report collector can read the files directly.

The following example uses parallel steps in one Docker pipeline. Drone's [workspace](https://docs.drone.io/pipeline/docker/syntax/workspace/) persists between that pipeline's steps, so each shard can write to a distinct report directory without an external artifact transfer.

## Give each shard its own output path

Assume the repository divides tests into two non-overlapping directories, `tests/shard_0` and `tests/shard_1`, and `requirements-ci.txt` pins pytest, pytest-cov, coverage.py, and the application's test dependencies. Install dependencies once into a virtual environment in the shared workspace.

```yaml
kind: pipeline
type: docker
name: sharded-tests

steps:
  - name: prepare
    image: python:3.13-slim
    commands:
      - python -m venv .venv
      - .venv/bin/pip install -r requirements-ci.txt
      - mkdir -p reports/shard-0 reports/shard-1
    depends_on: []

  - name: shard-0
    image: python:3.13-slim
    environment:
      COVERAGE_FILE: reports/shard-0/.coverage
    commands:
      - .venv/bin/pytest tests/shard_0 --junitxml=reports/shard-0/junit.xml --cov=app --cov-report=
    depends_on:
      - prepare

  - name: shard-1
    image: python:3.13-slim
    environment:
      COVERAGE_FILE: reports/shard-1/.coverage
    commands:
      - .venv/bin/pytest tests/shard_1 --junitxml=reports/shard-1/junit.xml --cov=app --cov-report=
    depends_on:
      - prepare

  - name: collect
    image: python:3.13-slim
    commands:
      - .venv/bin/coverage combine --keep reports/shard-0/.coverage reports/shard-1/.coverage
      - .venv/bin/coverage xml -o reports/coverage.xml
      - .venv/bin/coverage report --fail-under=80
    depends_on:
      - shard-0
      - shard-1
    when:
      status:
        - success
        - failure
```

The shared virtual environment is appropriate here because the steps use the same image, architecture, and workspace path. Pin an image digest for repeatability, and do not mutate that environment from parallel shards. If shards need different runtimes, install separately.

The two shards depend only on `prepare`, so they can run together. The collector waits for both. Drone documents this [dependency graph](https://docs.drone.io/pipeline/docker/syntax/parallelism/) and requires explicit dependencies throughout it.

## Retain failure semantics

Do not add `failure: ignore` to make aggregation convenient. A failing test command should still fail its shard and the pipeline. The collector's status condition lets it attempt reporting after a test failure; it does not turn that failure into a success.

A report collector is not guaranteed to run after cancellation, runner loss, timeout, or a failed clone. Design those cases as incomplete executions. A missing JUnit file is not an empty successful test suite.

The code combines the two exact coverage files, then applies a threshold to the combined result. [coverage.py's combine command](https://coverage.readthedocs.io/en/latest/commands/cmd_combine.html) accepts explicitly named data files and `--keep` preserves inputs. The [pytest-cov reporting options](https://pytest-cov.readthedocs.io/en/latest/reporting.html) allow suppressing per-shard report output while still collecting coverage data.

Do not average per-shard percentages. Different shards execute different lines, and overlap between them makes arithmetic averaging meaningless. Combine execution data against the same source revision and consistent path configuration. If checkout paths differ, configure coverage path mapping before trusting the result.

## Make the fan-in complete

JUnit outputs should remain separate until a consumer that supports multiple files reads them, or a format-aware merger combines them. Concatenating XML files creates invalid XML. Verify suite names, test identities, and duplicate-test handling in the reporting service you use.

If the test split changes, verify that every intended test belongs to one shard. Compare the combined collection list with an unsharded collection run, accounting for parameterized cases. The directory split above is easy to understand but can be unbalanced; timing-based assignment is an application concern, not an automatic consequence of `depends_on`.

Resource contention also matters. Two shards sharing a runner can compete for CPU, memory, network, or a common test database. Give database resources unique namespaces and measure elapsed time before increasing the shard count.

## Preserve results beyond completion

The generated files disappear with the workspace after the pipeline finishes. Add an artifact-upload step that depends on `collect` and runs for success and failure. Upload raw shard reports as well as any combined output so an aggregation failure still leaves evidence.

For separate pipelines, Drone does not provide a shared workspace. Each shard must publish to durable storage under an unambiguous build-and-shard identity, and the aggregation pipeline must download and verify the expected set. Account for sibling-pipeline failure and cancellation behavior before promising an always-available final report.

Exercise the configuration with one passing run, one failing shard, one missing report, and a combined coverage result below threshold. Confirm that useful reports survive and that none of those failure cases becomes a green build merely because the collector completed.
