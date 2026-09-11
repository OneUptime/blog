# Buildkite Parallelism and Concurrency Groups Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Concurrency, Testing, DevOps

Description: Combine Buildkite parallelism with resource-specific concurrency groups to limit shared service load while keeping unrelated pipeline work parallel.

---

`parallelism` controls how many jobs a Buildkite command step creates. `concurrency` and `concurrency_group` control access to a shared scheduling limit. They solve different problems: a step can create eight jobs while allowing only three of them to compete for a constrained external service at once.

Keep the concurrency group attached to the work that actually consumes that resource. A broad group applied to every job can serialize unrelated linting, packaging, and unit tests without protecting anything additional.

## Start with a resource-specific limit

Suppose browser tests use a service with three available sessions:

```yaml
steps:
  - label: "Unit tests"
    key: unit-tests
    command: "bash .buildkite/scripts/unit-tests.sh"

  - label: "Browser shard %n"
    key: browser-tests
    command: "python3 .buildkite/run-browser-shard.py"
    parallelism: 8
    concurrency: 3
    concurrency_group: "shared-browser-service/test-sessions"
    concurrency_method: "eager"
    agents:
      queue: "browser-tests"

  - label: "Package application"
    key: package-app
    depends_on:
      - unit-tests
      - browser-tests
    command: "bash .buildkite/scripts/package.sh"
```

This creates eight browser jobs. The group controls the constrained work, while unit tests remain outside it. Packaging waits for both logical test steps, including all browser shards.

The group name describes the shared resource. If another pipeline uses the same browser service, give its relevant jobs the same group and a consistent limit. If it uses a different account with independent capacity, use a different group.

## Understand what the group counts

Buildkite's [concurrency guide](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency) describes groups as organization-wide labels used when applying job limits. Group scheduling considers job states beyond just a process currently running, so it should not be modeled as a direct count of open network connections.

A job that acquires a group slot but waits for an eligible agent can still affect throughput. Size and route the agent queue appropriately instead of assuming a concurrency limit guarantees three active test processes at all times.

The limit also applies to jobs, not the workers launched inside each job. If one browser job opens four sessions, `concurrency: 3` can still produce twelve sessions. Configure the test runner for one session per job, or reduce the number of simultaneous jobs based on measured per-job demand.

## Divide tests across the generated jobs

Parallelism does not automatically shard your test suite. The command receives a zero-based index and the total job count through Buildkite environment variables. A simple deterministic Python shard runner can use them:

```python
import os
from pathlib import Path
import subprocess
import sys

index = int(os.environ["BUILDKITE_PARALLEL_JOB"])
count = int(os.environ["BUILDKITE_PARALLEL_JOB_COUNT"])
if count < 1 or not 0 <= index < count:
    raise SystemExit("Invalid shard configuration")

files = sorted(str(path) for path in Path("tests/browser").glob("test_*.py"))
if not files:
    raise SystemExit("No browser tests were discovered")
selected = files[index::count]
if not selected:
    print(f"Shard {index} has no assigned files")
    raise SystemExit(0)

raise SystemExit(subprocess.call([sys.executable, "-m", "pytest", *selected]))
```

This example assumes Python, pytest, and your browser-test dependencies are installed on the agent. Configure the browser fixture to use one session at a time. The script fails when discovery finds no tests at all, while intentionally empty shards can finish successfully when there are fewer files than shards.

Sorting keeps assignment stable for the same file set. For uneven test durations, use historical timing data or a test distribution tool rather than increasing the shard count indefinitely.

## Choose ordering based on resource semantics

The default concurrency method is `ordered`. That is useful for work such as deployments where creation order matters. For a limited pool of interchangeable browser sessions, `eager` removes the ordering requirement so eligible work can use available capacity.

Do not use eager scheduling for a release sequence that must deploy older revisions before newer ones. Conversely, ordered scheduling can leave a resource underused when older jobs are waiting on other conditions and order does not matter to the service.

Explicit dependencies remain the right way to require tests before packaging. Concurrency is a resource control, not a replacement for the pipeline's dependency graph.

## Avoid a group that covers the whole pipeline

A group called `ci` applied to lint, unit tests, browser tests, and packaging makes all those jobs contend for the same capacity. Name groups for the thing that cannot safely be used concurrently: a deployment target, shared database, license pool, or external test service.

Keep short resource-independent preparation outside the group where practical. If a job spends most of its time installing dependencies while holding a scarce service slot, move reusable preparation earlier or use a prepared agent image.

For a multi-step operation that must remain isolated as a unit, consult Buildkite's concurrency gate pattern. Adding the same group to only the first step does not reserve a slot for all later work.

## Change limits carefully

Concurrency values are stored on jobs when they are created. Changing YAML affects future jobs; older queued jobs retain their original limits. The current concurrency guide explains that mixed limits can produce surprising ordering and leave older jobs waiting under sustained load.

Drain the group before a material limit change when possible. Coordinate changes across every pipeline sharing the group so one consumer does not introduce a conflicting policy.

## Verify scheduling and actual load

Run overlapping builds from two pipelines sharing the resource. Observe job states, group waiting time, agent availability, and the service's actual session count. Confirm unrelated unit tests continue while browser jobs wait.

Make one shard fail and verify packaging remains blocked. Then test cancellation and retries so abandoned external sessions do not reduce usable capacity after the Buildkite job releases its slot.

## Conclusion

Use parallelism to create work and concurrency groups to protect shared resources. Keep groups narrowly scoped, shard the test suite explicitly, and measure actual service usage alongside scheduler limits.

## Official Documentation

- [Controlling concurrency](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency)
- [Command parallelism](https://buildkite.com/docs/pipelines/configure/step-types/command-step)
- [Parallel job environment variables](https://buildkite.com/docs/pipelines/configure/environment-variables)
- [Step dependencies](https://buildkite.com/docs/pipelines/configure/depends-on)
