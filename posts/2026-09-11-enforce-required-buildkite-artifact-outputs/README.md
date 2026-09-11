# Why Missing Buildkite Artifact Globs Do Not Fail a Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, CI/CD, Bash, Testing, Troubleshooting

Description: Make required Buildkite outputs fail explicitly by checking files before upload, validating package contents, and preserving test failures.

---

A green Buildkite job can upload no artifacts at all. An upload glob describes files to collect; it is not a declaration that at least one matching file must exist.

In the agent v4.0.3 [artifact uploader implementation](https://github.com/buildkite/agent/blob/v4.0.3/internal/artifact/uploader.go), collecting zero files logs a message and returns successfully. If your release requires an archive or your test job requires a report, enforce that requirement in the command script before depending on artifact collection.

## Separate collection from output requirements

Consider this step:

```yaml
steps:
  - label: "Package application"
    command: "bash .buildkite/scripts/package.sh"
    artifact_paths:
      - "dist/*.tar.gz"
```

If `package.sh` exits successfully but writes nothing under `dist/`, the glob can match no files. The step does not automatically become a package-integrity check.

This behavior is useful for optional diagnostics: not every successful test produces a screenshot or crash dump. The problem is using the same permissive collection mechanism as the only enforcement for required release output.

## Check a known file explicitly

When a release has a fixed output path, keep the check simple:

```bash
#!/usr/bin/env bash
set -euo pipefail

mkdir -p dist
# The repository-specific packaging command must create this archive.
./scripts/build-release.sh

archive=dist/application.tar.gz
if [[ ! -s "$archive" ]]; then
  printf 'Required archive is missing or empty: %s\n' "$archive" >&2
  exit 1
fi

tar -tzf "$archive" >/dev/null
buildkite-agent artifact upload "$archive"
```

`-s` requires a nonempty file. `tar -tzf` verifies that the archive is readable. Add application-specific checks for required archive members or a release manifest if those are part of the contract.

Do not also list the same archive under `artifact_paths` unless you intentionally want another upload attempt. For this explicit-upload pattern, the command owns both validation and upload. Keep optional logs in `artifact_paths` if they are useful after a failure.

## Check a variable set of outputs

For a variable number of top-level tarballs, a Bash array gives you an explicit count:

```bash
#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

archives=(dist/*.tar.gz)
if (( ${#archives[@]} == 0 )); then
  echo 'Packaging produced no release archives' >&2
  exit 1
fi

for archive in "${archives[@]}"; do
  [[ -s "$archive" ]] || {
    printf 'Empty archive: %s\n' "$archive" >&2
    exit 1
  }
  tar -tzf "$archive" >/dev/null
done

buildkite-agent artifact upload 'dist/*.tar.gz'
```

`nullglob` is a Bash feature. Without it, an unmatched shell glob can remain as the literal text `dist/*.tar.gz`, which makes a naive array count misleading. Quote the glob passed to the Buildkite CLI so the agent receives one pattern rather than a shell-expanded list of positional arguments.

The shell validation pattern and agent upload pattern should describe the same intended output set. If your outputs span nested directories, use a deliberate recursive discovery strategy and test it with your actual directory layout.

## Validate required test reports without hiding test failures

A test runner can fail and still produce valuable JUnit output. Preserve that failure while checking the report contract:

```bash
#!/usr/bin/env bash
set -euo pipefail

test_status=0
./scripts/run-tests-with-junit.sh || test_status=$?

report_status=0
if [[ ! -s reports/junit.xml ]]; then
  echo 'Required JUnit report is missing or empty' >&2
  report_status=1
else
  python3 - <<'PYXML' || report_status=$?
import xml.etree.ElementTree as ET
root = ET.parse("reports/junit.xml").getroot()
if root.tag not in {"testsuite", "testsuites"}:
    raise SystemExit("Unexpected JUnit root element")
PYXML
fi

if (( test_status != 0 )); then
  exit "$test_status"
fi
exit "$report_status"
```

Configure `artifact_paths: "reports/junit.xml"` on this test step so the report is collected after the command. The XML check catches missing or malformed output; it does not certify that every test executed or that the report's counts are correct. Adapt validation to the report format your runner emits.

Capturing the test exit status is essential. Replacing the final result with the success of an upload or an `echo` can make a failed suite appear green.

## Avoid stale files satisfying the check

A reused workspace or build script may leave an older archive behind. A file-existence check will accept it unless the producer makes output ownership clear.

Build into a fresh job-specific directory or have the packaging command initialize its own output directory before creating release files. Include the commit or version in a manifest and check it against the current build's expected revision. Perform cleanup only within the directory the script owns.

For parallel jobs, use separate report directories. A shared path can both hide a missing shard and make artifact downloads ambiguous later.

## Verify failure cases deliberately

Test three cases in a disposable workspace: no output, a zero-byte output, and a valid output. Then add a malformed archive or report. The first three invalid cases should fail before release consumption; the valid case should upload successfully.

In a Buildkite test build, also make the underlying test command fail while producing a valid report. Confirm the build remains failed and the report remains available. This proves that collection and status propagation work together.

A local file check cannot validate artifact permissions or storage connectivity. Exercise a real upload and a scoped download before relying on the package in a release workflow.

## Conclusion

Artifact globs collect optional matches. Required deliverables need explicit existence, content, and provenance checks in the producer, with the original build or test failure preserved.

## Official Documentation

- [Artifact upload CLI](https://buildkite.com/docs/agent/cli/reference/artifact)
- [Build artifact collection](https://buildkite.com/docs/pipelines/configure/artifacts)
- [Agent v4.0.3 uploader behavior](https://github.com/buildkite/agent/blob/v4.0.3/internal/artifact/uploader.go)
