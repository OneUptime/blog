# How to Generate a Buildkite Test Matrix with Stable Step Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Testing, Automation, YAML

Description: Generate deterministic Buildkite matrix jobs with JSON, explicit join dependencies, unique keys, and a reproducible preview workflow.

---

A test matrix turns a list of supported environments into independent jobs. Dynamic generation is useful when that list comes from repository configuration or when only some combinations are valid. Stable keys make the resulting build understandable: retries, dependencies, and artifact consumers can identify the same logical job consistently.

Keep presentation labels separate from machine identifiers. A label can contain descriptive text, while a key should come from normalized, controlled dimensions rather than a timestamp or random UUID.

## Define the matrix inputs

Assume a Python application supports two interpreter versions and two database backends. Store the supported combinations in `.buildkite/test-matrix.json`:

```json
{
  "python_versions": ["3.12", "3.13"],
  "databases": ["sqlite", "postgres"]
}
```

These are example application requirements. Use versions that your repository and agent images actually support. A pipeline generator should not silently expand the support policy whenever a newer runtime is released.

If a combination is invalid, represent that decision in a checked-in exclusion list or generator rule. Avoid creating a job that exits successfully without testing merely because its environment is unsupported.

## Generate deterministic step definitions

Save the following as `.buildkite/generate-matrix.py`:

```python
import itertools
import json
import re
from pathlib import Path

config = json.loads(Path(".buildkite/test-matrix.json").read_text())
versions = sorted(set(config["python_versions"]))
databases = sorted(set(config["databases"]))

if not versions or not databases:
    raise SystemExit("The test matrix must not be empty")

steps = []
keys = []
for version, database in itertools.product(versions, databases):
    if not re.fullmatch(r"3\.\d+", version):
        raise SystemExit(f"Invalid Python version: {version!r}")
    if database not in {"sqlite", "postgres"}:
        raise SystemExit(f"Invalid database: {database!r}")
    key = f"test-py{version.replace('.', '-')}-{database}"
    if key in keys:
        raise SystemExit(f"Duplicate step key: {key}")
    keys.append(key)
    steps.append({
        "label": f"Python {version} / {database}",
        "key": key,
        "command": "bash .buildkite/scripts/test-combination.sh",
        "agents": {"queue": "python-tests"},
        "env": {"PYTHON_VERSION": version, "TEST_DATABASE": database},
    })

steps.append({
    "label": "Matrix passed",
    "key": "matrix-passed",
    "depends_on": keys,
    "command": "echo 'All required matrix jobs passed'",
})
print(json.dumps({"steps": steps}, indent=2))
```

Sorting and deduplicating the inputs makes output stable for a given policy. The explicit duplicate check protects future normalization changes. Buildkite keys must be unique within the build and cannot use the UUID-shaped pattern described in the [command step reference](https://buildkite.com/docs/pipelines/configure/step-types/command-step).

The final step joins exactly the generated tests. An explicit list is easier to audit than a dependency whose membership changes when unrelated steps are inserted elsewhere.

## Upload once from a small bootstrap job

Configure the initial pipeline to run a repository script:

```yaml
steps:
  - label: "Generate test matrix"
    key: generate-matrix
    command: "bash .buildkite/scripts/upload-matrix.sh"
```

The upload script is:

```bash
#!/usr/bin/env bash
set -euo pipefail

pipeline_file=$(mktemp)
trap 'rm -f "$pipeline_file"' EXIT
python3 .buildkite/generate-matrix.py > "$pipeline_file"
buildkite-agent pipeline upload --no-interpolation "$pipeline_file"
```

The generated command is fixed, and the dimension values are serialized as environment data. This avoids shell quoting errors as the matrix evolves. `--no-interpolation` prevents upload-time substitution of any dollar references that future generated commands intentionally retain for runtime.

The [dynamic pipeline guide](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines) explains that generated jobs can run on different matching agents. Every matrix job must therefore provision its own environment or use a prepared image; it cannot rely on tools installed only by the generator.

## Implement the test environment deliberately

`test-combination.sh` is the repository's integration point. It should select the requested interpreter, prepare the selected database, run the same test suite, and fail when setup or testing fails.

Print the resolved interpreter and database versions at the beginning of the job. An environment variable saying `3.13` does not prove the command actually ran under Python 3.13. If you use containers, pin and maintain the appropriate images through your existing dependency process.

For artifacts, put each combination under a distinct path such as `reports/py3-13-postgres/junit.xml`. Stable step keys disambiguate jobs, but identical artifact paths from many jobs still make collection harder.

## Preview and test the generator

Render twice and compare the output:

```bash
python3 .buildkite/generate-matrix.py > /tmp/matrix-a.json
python3 .buildkite/generate-matrix.py > /tmp/matrix-b.json
cmp /tmp/matrix-a.json /tmp/matrix-b.json

BUILDKITE_AGENT_ACCESS_TOKEN=local-dry-run-placeholder \
  buildkite-agent pipeline upload --dry-run --no-interpolation /tmp/matrix-a.json
```

The placeholder accommodates agent v4.0.3's local dry-run argument requirement; use it only with `--dry-run`. Inside a running Buildkite job, the agent supplies its normal job context.

Test an empty list and an invalid database and confirm generation fails. In a test build, fail one combination deliberately and verify the join step does not run. Confirm the queue can launch all required environments.

## Bound the amount of generated work

Count the Cartesian product before expanding a large matrix. Adding operating systems, architectures, and database versions can create far more jobs than expected. Check your organization's current job and upload limits, and split only when there is a clear dependency plan.

Prefer a small required matrix plus separately scheduled broader compatibility coverage when that matches the project's support policy. The distinction should be visible in keys and labels rather than hidden inside a test script.

## Conclusion

Generate a test matrix from explicit support data, use deterministic keys, and join the exact jobs that matter. Stable configuration makes changes reviewable and failed combinations easy to reproduce.

## Official Documentation

- [Dynamic pipelines](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines)
- [Command step keys](https://buildkite.com/docs/pipelines/configure/step-types/command-step)
- [Explicit dependencies](https://buildkite.com/docs/pipelines/configure/depends-on)
