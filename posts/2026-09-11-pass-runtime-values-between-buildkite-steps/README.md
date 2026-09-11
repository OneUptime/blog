# How to Pass Runtime Values Between Buildkite Steps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, DevOps, Automation, Bash

Description: Share runtime values through build metadata, order consumers with dependencies, and upload dynamic Buildkite steps without leaking shell state.

---

A version discovered during a build is not automatically available to every other Buildkite job. Each command job has its own process environment and may run on a different agent. An `export` affects the current process and its children; it does not update another machine's shell.

Use build metadata for a small value that another job must retrieve. Use dynamic pipeline generation when that value determines which jobs should exist or what their configuration should contain. The important design decision is when the value becomes available, because a consumer must not start before its producer finishes.

## Store the value and declare the dependency

Assume a repository has `package.json` and its agents provide Node.js and Bash. Create `.buildkite/scripts/publish-version.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

version=$(node -p '
  const version = require("./package.json").version;
  typeof version === "string" ? version : ""
')
[[ -n "$version" ]] || { echo 'Missing package version' >&2; exit 1; }
buildkite-agent meta-data set release-version "$version"
```

Then define two jobs in the pipeline file uploaded by the bootstrap step:

```yaml
steps:
  - label: "Read release version"
    key: release-version
    command: "bash .buildkite/scripts/publish-version.sh"

  - label: "Package release"
    key: package-release
    depends_on: release-version
    command: "bash .buildkite/scripts/package-release.sh"
```

The second script retrieves the value at runtime:

```bash
#!/usr/bin/env bash
set -euo pipefail

version=$(buildkite-agent meta-data get release-version)
printf 'Packaging release %s\n' "$version"
mkdir -p dist
printf '%s\n' "$version" > dist/version.txt
buildkite-agent artifact upload dist/version.txt
```

Buildkite's [metadata command](https://buildkite.com/docs/agent/cli/reference/meta-data) stores string values against the build. Reading metadata does not wait for a producer, so the dependency is essential. A fixed key works here because only one job owns it. Parallel producers should use separate keys, such as `packages/api/version` and `packages/web/version`.

Make a required read fail if the value is absent. A default is useful for an optional setting, but an invented version can turn a missing producer into an incorrect release. Preserve a failure as a failure instead of silently packaging stale or placeholder data.

## Generate jobs after the value exists

Sometimes the version selects a release workflow or changes a label. Add a generator that depends on the version producer:

```yaml
steps:
  - label: "Read release version"
    key: release-version
    command: "bash .buildkite/scripts/publish-version.sh"

  - label: "Generate release jobs"
    key: generate-release
    depends_on: release-version
    command: "bash .buildkite/scripts/generate-release.sh"
```

Implement `.buildkite/scripts/generate-release.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

export RELEASE_VERSION
RELEASE_VERSION=$(buildkite-agent meta-data get release-version)
pipeline_file=$(mktemp)
trap 'rm -f "$pipeline_file"' EXIT
python3 .buildkite/scripts/release-pipeline.py > "$pipeline_file"
buildkite-agent pipeline upload --no-interpolation "$pipeline_file"
```

The wrapper uses a unique temporary file so overlapping jobs cannot overwrite each other's generated pipeline. Its `EXIT` trap removes the file after either successful upload or failure.

The Python generator is:

```python
import json
import os

version = os.environ["RELEASE_VERSION"]
pipeline = {
    "steps": [{
        "label": f"Package {version}",
        "key": "package-release",
        "command": "bash .buildkite/scripts/package-from-env.sh",
        "env": {"RELEASE_VERSION": version},
    }]
}
print(json.dumps(pipeline))
```

In `package-from-env.sh`, read `"$RELEASE_VERSION"` as an ordinary shell variable. JSON serialization handles quotes and newlines in data without manually assembling YAML. The uploader's `--no-interpolation` flag also prevents an unexpected dollar sign inside a runtime value from becoming another substitution pass. This example requires Python 3 on the upload agent.

## Keep build configuration scoped

Prefer step-level `env` on generated jobs. Updating top-level build environment from several concurrent uploads creates ordering questions that are difficult to reproduce. A consumer-specific value is easier to reason about when its definition travels with that consumer.

Do not place shell commands in metadata and execute them with `eval`. Treat metadata as data: validate the expected format, pass it as a quoted argument, or serialize it into a configuration document. If a release version must follow your package policy, validate that policy before building the final commands.

Metadata is also not a secret store. It is visible to people and tools with build access. Store an image digest, version, or resource identifier there; retrieve credentials through your established secrets integration. Put large reports and binary output in artifacts, then share the artifact's identity.

## Verify the handoff

Run the producer and inspect the `release-version` metadata in the build. Confirm that the consumer remains dependent on the producer, reads the exact value, and succeeds on another agent. This catches accidental reliance on the producer's filesystem.

For generated configuration, render it locally with a harmless value and inspect the uploader's output:

```bash
RELEASE_VERSION=1.2.3 python3 .buildkite/scripts/release-pipeline.py > /tmp/preview.json
BUILDKITE_AGENT_ACCESS_TOKEN=local-dry-run-placeholder \
  buildkite-agent pipeline upload --dry-run --no-interpolation /tmp/preview.json
```

Agent v4.0.3 requires an access-token value even for this local preview; the placeholder is sufficient only with `--dry-run`. A dry run checks the generated structure without scheduling jobs. A real test build is still needed to verify metadata permissions, queue access, and the repository's packaging command. Retry the producer once during testing and confirm that overwriting its key is the intended behavior.

## Conclusion

Publish runtime values through metadata, make dependencies explicit, and generate new steps only after their inputs exist. A job should receive its inputs through an intentional interface rather than another job's shell state.

## Official Documentation

- [Using build metadata](https://buildkite.com/docs/pipelines/configure/build-meta-data)
- [Dynamic pipelines](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines)
- [Pipeline upload and interpolation](https://buildkite.com/docs/agent/cli/reference/pipeline)
