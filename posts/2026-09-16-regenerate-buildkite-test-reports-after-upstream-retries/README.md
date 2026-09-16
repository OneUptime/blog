# How to Regenerate Buildkite Test Reports After Retrying Upstream Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Testing, Automation, Bash

Description: Rebuild Buildkite report artifacts from current test attempts, permit successful report jobs to rerun, and prevent stale annotations.

---

A green report job does not mean its contents reflect the latest test attempt. If a test shard fails, the report generator runs, and you later retry that shard, the report already produced is a snapshot of the earlier inputs.

Treat report generation as a repeatable operation. Give it explicit dependencies, allow a successful report job to be retried, and make every invocation collect fresh inputs before replacing the visible summary.

## Make report jobs repeatable

This pipeline keeps report publication independent from the test result:

```yaml
steps:
  - label: "Tests %n"
    key: tests
    parallelism: 4
    command: "bash .buildkite/scripts/test-shard.sh"
    artifact_paths:
      - "reports/shard-*/junit.xml"

  - label: "Publish test summary"
    key: test-summary
    depends_on: tests
    allow_dependency_failure: true
    cancel_on_build_failing: false
    command: "bash .buildkite/scripts/test-summary.sh"
    retry:
      manual:
        allowed: true
        permit_on_passed: true
```

The test script must write a distinct `reports/shard-N/junit.xml` path for each parallel job. It must preserve its test exit status. A reporting command can succeed at publishing a summary even when the tests fail; the failed test jobs still determine the build's failure.

`allow_dependency_failure` permits reporting after a failed dependency, but does not turn cancellation into an unconditional finalizer. Buildkite documents this distinction in [dependency behavior](https://buildkite.com/docs/pipelines/configure/depends-on). The [retry configuration](https://buildkite.com/docs/pipelines/configure/retry) documents `permit_on_passed`, which is the essential setting when the existing report job is green.

## Refresh the inputs and annotation

Put this in `.buildkite/scripts/test-summary.sh` on a Linux agent with Python 3:

```bash
#!/usr/bin/env bash
set -euo pipefail

report_tmp=$(mktemp -d)
trap 'rm -rf -- "$report_tmp"' EXIT
buildkite-agent artifact download 'reports/shard-*/junit.xml' \
  "$report_tmp" --step tests
python3 .buildkite/scripts/summarize-junit.py "$report_tmp" \
  > "$report_tmp/summary.md"
buildkite-agent annotate --context test-summary --style info \
  < "$report_tmp/summary.md"
```

The temporary directory avoids accidentally combining new downloads with files from the previous attempt. The stable annotation context replaces the summary rather than adding another disconnected annotation. Do not pass `--append` when the goal is to replace stale content.

The [artifact CLI](https://buildkite.com/docs/agent/cli/reference/artifact) selects the latest retried jobs by default. Adding `--include-retried-jobs` changes that selection and can mix failed and successful attempts. Keep historical attempts for diagnostics in a separate view.

A small example renderer follows. Save it as `.buildkite/scripts/summarize-junit.py`; it assumes each shard emits one standard JUnit XML file:

```python
import sys
from pathlib import Path
from xml.etree import ElementTree

root = Path(sys.argv[1])
files = sorted(root.glob("reports/shard-*/junit.xml"))
expected = 4
if len(files) != expected:
    raise SystemExit(f"Expected {expected} shard reports, found {len(files)}")

counts = dict(tests=0, failures=0, errors=0, skipped=0)
for path in files:
    xml = ElementTree.parse(path)
    for case in xml.iter("testcase"):
        counts["tests"] += 1
        for outcome in ("failure", "error", "skipped"):
            if case.find(outcome) is not None:
                name = {"failure": "failures", "error": "errors",
                        "skipped": "skipped"}[outcome]
                counts[name] += 1

print("## Test summary")
print("\n" + ", ".join(f"{n} {k}" for k, n in counts.items()))
```

This counts test cases rather than summing nested suite totals, which can double-count results. Adapt it for namespaced XML or framework-specific retry elements. Keep the expected shard count aligned with pipeline parallelism and decide explicitly how skipped or missing shards should appear.

## Rerun in the correct order

Retry the failed upstream jobs first. Wait for their replacement attempts and artifact uploads to finish. Then retry the report job. A dependency graph orders initial execution; do not assume it automatically invalidates a report that already finished when an upstream job is retried.

For automation, use the [Jobs API](https://buildkite.com/docs/apis/rest-api/jobs) to retry the report after verifying the producer attempts are terminal. Each retry returns a new job ID; use that ID for subsequent attempts. Reusing the original ID indefinitely is not a retry loop supported by the API.

Avoid retrying the report while the upstream retry is still uploading. You may otherwise publish another internally consistent but outdated snapshot. Include producer attempt IDs in a richer report manifest when precise provenance matters.

## Check the recovery workflow

Create a test build with one intentional assertion failure. Publish its report, retry the failing shard after making the test input pass, and rerun the report. Confirm the failure count changes and only one summary annotation remains.

Repeat with a missing XML file. The report should fail visibly instead of publishing an apparently complete result. Also confirm old local files cannot satisfy the missing-file check.

The report is trustworthy when its inputs are explicit, its publication is replaceable, and a successful reporting attempt can be regenerated after the underlying tests change.
