# How to Share Buildkite Artifacts Without Ambiguous Matches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, DevOps, Automation, Testing

Description: Scope Buildkite artifact downloads by build, producer step, job, and path to make cross-step and downstream consumption predictable.

---

An artifact filename is only part of its identity. Several jobs can upload `dist/app.tar.gz`, and several builds can produce different contents at that path. A consumer that searches too broadly can encounter an ambiguous match or retrieve output whose provenance is unclear.

Treat a required artifact as a tuple: source build, producer job or step, artifact path, and the retry attempt policy. Use dependencies to ensure it exists before download, then verify the content expected by the consumer.

## Give the producer a stable identity

A simple packaging pipeline is:

```yaml
steps:
  - label: "Package application"
    key: package-app
    command: "bash .buildkite/scripts/package-app.sh"
    artifact_paths:
      - "dist/app.tar.gz"
      - "dist/app.tar.gz.sha256"

  - label: "Inspect package"
    key: inspect-package
    depends_on: package-app
    command: "bash .buildkite/scripts/inspect-package.sh"
```

The packaging script should create the archive and checksum, and fail if required output is absent. `artifact_paths` arranges upload after the command; it does not create the archive or prove the application's package is valid.

For a Linux agent with GNU checksum tools, the relevant producer commands might be:

```bash
mkdir -p dist
tar -czf dist/app.tar.gz -C package .
(
  cd dist
  sha256sum app.tar.gz > app.tar.gz.sha256
)
```

This assumes your build already populated `package/`. Use `shasum -a 256` and the matching verification command on platforms that do not provide `sha256sum`.

## Scope downloads to the producer

The consumer script can use:

```bash
#!/usr/bin/env bash
set -euo pipefail

mkdir -p incoming
buildkite-agent artifact download 'dist/app.tar.gz' incoming/ \
  --step package-app
buildkite-agent artifact download 'dist/app.tar.gz.sha256' incoming/ \
  --step package-app

(
  cd incoming/dist
  sha256sum -c app.tar.gz.sha256
  tar -tzf app.tar.gz
)
```

The destination retains the artifact's uploaded path, so the file is under `incoming/dist/`. Check that path before changing directories. Avoid assuming downloads flatten all files into the destination root.

The [artifact CLI reference](https://buildkite.com/docs/agent/cli/reference/artifact) allows `--step` to identify a step key, label, or job ID. Prefer a stable key over a label that includes changing release text. A dependency ensures the producer finishes before the consumer starts, even when they run on different machines.

## Select another build explicitly

For a pipeline triggered by the producer's build, use the provided parent build ID:

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${BUILDKITE_TRIGGERED_FROM_BUILD_ID:?Expected a triggering build}"
buildkite-agent artifact download 'dist/app.tar.gz' incoming/ \
  --build "$BUILDKITE_TRIGGERED_FROM_BUILD_ID" \
  --step package-app
```

A manually started downstream build does not necessarily have this value. Require an explicit approved source build in that workflow rather than falling back to whichever recent build happens to exist.

For other cross-build consumption, resolve the intended build through your release process and pass its immutable build UUID. Avoid a vague convention such as "latest successful build on this branch" if the consumer is deploying code tested by a particular parent.

Buildkite's [artifact guide](https://buildkite.com/docs/pipelines/configure/artifacts) also describes cluster boundaries. Cross-cluster artifact access requires an appropriate rule; correct filenames and build IDs do not bypass that boundary.

## Make parallel outputs unique

A parallel step creates multiple jobs with the same step key. Scoping a download to that key does not identify one shard. If every shard uploads `reports/junit.xml`, the consumer still has several producers for the same path.

Write the shard index into the path:

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${BUILDKITE_PARALLEL_JOB:?Expected a parallel job}"
report_dir="reports/shard-${BUILDKITE_PARALLEL_JOB}"
mkdir -p "$report_dir"
# Configure the repository's test runner to write:
# "$report_dir/junit.xml"
buildkite-agent artifact upload "$report_dir/junit.xml"
```

The test runner invocation is application-specific. It must produce the file before upload, and required-output checks should fail if it does not. An aggregator can download `reports/*` scoped to the parallel test step and retain each shard's directory.

When a consumer needs exactly one job, pass that producer's job ID and use it with `--step`. A step key alone intentionally selects the whole logical step.

## Decide how retries should behave

By default, artifact commands select the latest attempt of retried jobs. `--include-retried-jobs` broadens the search to earlier attempts. That is useful for debugging failed tests, but it can introduce multiple artifacts with identical names.

For deployment artifacts, consume the final intended producer attempt and verify the manifest or digest. For diagnostic archives, preserve attempt identity in the path or download each job's artifacts separately.

Do not fix an exact-path ambiguity by broadening the query to a wildcard unless collecting multiple outputs is actually the requirement. A wildcard changes selection behavior; it does not establish provenance.

## Inspect before downloading broadly

Search can reveal the actual producer jobs and paths:

```bash
buildkite-agent artifact search 'dist/*' --step package-app
```

If expected output is missing, check the producer's working directory, artifact upload phase, retention policy, and retry history. Outside a running Buildkite job, use the authenticated artifacts REST API rather than trying to reconstruct the agent's job credentials.

## Conclusion

Use stable producer keys, explicit build IDs, unique parallel paths, and a deliberate retry policy. Artifact downloads become predictable when provenance is part of the interface rather than inferred from a filename.

## Official Documentation

- [Build artifacts and ambiguity](https://buildkite.com/docs/pipelines/configure/artifacts)
- [Artifact CLI](https://buildkite.com/docs/agent/cli/reference/artifact)
- [Artifacts REST API](https://buildkite.com/docs/apis/rest-api/artifacts)
