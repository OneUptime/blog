# How to Upload Custom Test Framework Results to Buildkite Test Engine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, Testing, JSON, CI/CD, Python

Description: Convert custom test outcomes into Buildkite JSON, upload them with stable run metadata, and preserve the original test exit status.

---

A custom test harness does not need a dedicated Buildkite collector to appear in Test Engine. It can emit JUnit XML or Buildkite's JSON result format and upload the file through the ingestion API.

The important work is defining stable test identities, preserving durations and failure outcomes, and associating each upload with the correct build and job. An HTTP success from an upload should not replace the test runner's exit status.

## Use the correct JSON format

For `format=json`, Buildkite expects its own result schema, not arbitrary JSON from your test harness. A small result file looks like this:

```json
[
  {
    "scope": "Parser",
    "name": "accepts an empty document",
    "file_name": "tests/parser.spec",
    "location": "tests/parser.spec:12",
    "result": "passed",
    "history": {
      "start_at": 100.0,
      "end_at": 100.034,
      "duration": 0.034
    }
  },
  {
    "scope": "Parser",
    "name": "rejects a duplicate key",
    "file_name": "tests/parser.spec",
    "location": "tests/parser.spec:28",
    "result": "failed",
    "failure_reason": "Expected duplicate-key error",
    "history": {
      "start_at": 100.04,
      "end_at": 100.051,
      "duration": 0.011
    }
  }
]
```

The timestamps are illustrative monotonic values, and durations are seconds. Use real measurements from the harness. Keep `scope` and `name` stable across builds; embedding a timestamp in the test name prevents meaningful history.

The [JSON import reference](https://buildkite.com/docs/pipelines/configure/tests/test-collection/importing-json) defines result values and fields. Supported outcomes include `passed`, `failed`, `skipped`, and `unknown`. Preserve the location on every upload if you want reliable ownership matching.

## Convert the harness's data explicitly

Map assertion failures to failed results, intentional skips to skipped results, and infrastructure failures according to what actually executed. Do not manufacture thousands of passing cases when the runner crashed before collecting tests.

Measure individual test duration with a monotonic clock. Convert milliseconds to seconds once at the adapter boundary. Reject negative, nonfinite, or missing required values before upload. JSON serializers may otherwise emit nonstandard `NaN` values that appear valid in local code but are unsuitable for ingestion.

Use a fixture containing a pass, failure, skip, parameterized case, and Unicode test name to test the adapter. Include a failure message with quotes and newlines to ensure the serializer escapes it correctly. Never construct JSON by concatenating raw test output.

For frameworks with supported native formats, use the matching format such as `rspec-json` instead of converting unnecessarily. Generic JSON and a native runner's JSON are different upload contracts.

## Upload from a controlled script

Provision the suite's upload token as `BUILDKITE_ANALYTICS_TOKEN` through your secret system. Save this wrapper as `.buildkite/scripts/test-and-upload.sh`, adapting the runner invocation to your harness:

```bash
#!/usr/bin/env bash
set -uo pipefail
set +x

: "${BUILDKITE_ANALYTICS_TOKEN:?Missing suite upload token}"
rm -f -- test-results.json || exit 1
./scripts/custom-test-runner --buildkite-json test-results.json
test_status=$?

if [[ ! -s test-results.json ]]; then
  echo 'Custom runner did not produce test results' >&2
  if (( test_status != 0 )); then
    exit "$test_status"
  fi
  exit 1
fi

curl --fail-with-body --silent --show-error \
  -H "Authorization: Token token=\"$BUILDKITE_ANALYTICS_TOKEN\"" \
  -F 'data=@test-results.json' \
  --form-string 'format=json' \
  --form-string 'run_env[CI]=buildkite' \
  --form-string "run_env[key]=$BUILDKITE_BUILD_ID" \
  --form-string "run_env[job_id]=$BUILDKITE_JOB_ID" \
  --form-string "run_env[url]=$BUILDKITE_BUILD_URL" \
  --form-string "run_env[branch]=$BUILDKITE_BRANCH" \
  --form-string "run_env[commit_sha]=$BUILDKITE_COMMIT" \
  --form-string "run_env[number]=$BUILDKITE_BUILD_NUMBER" \
  https://analytics-api.buildkite.com/v1/uploads
upload_status=$?

if (( test_status != 0 )); then
  exit "$test_status"
fi
exit "$upload_status"
```

The runner must write a fresh result file for this invocation even when tests fail. The wrapper removes stale output first so an earlier result cannot masquerade as this attempt. The script intentionally omits `set -e` to capture both outcomes.

`--form-string` treats runtime metadata as literal form values. Shell tracing remains disabled around the token. Avoid verbose HTTP logging and keep the token out of source control.

## Keep run and attempt identity straight

Parallel shards should share the build's run key while identifying their individual job IDs. Do not give each test a new run key or reuse one constant key across unrelated builds.

The [CI environment guide](https://buildkite.com/docs/pipelines/configure/tests/test-collection/ci-environments) describes the metadata used to group executions. Retried jobs represent new attempts, so retain their actual job identity and avoid re-uploading old files as though they came from the replacement job.

Choose one uploader per execution. If the harness uploads directly, disable overlapping collector or bktec uploads for the same results. The [test collection overview](https://buildkite.com/docs/pipelines/configure/tests/test-collection) explains the duplicate-execution risk.

## Check ingestion, not just transport

A single file can contain at most 5,000 results. Split larger runs into multiple files with the same run key and deliberate shard or job metadata. Keep a local manifest of uploaded chunks so retrying an interrupted upload process does not blindly replay everything.

Inspect upload health and a sample run in Test Engine. Verify failure text, duration units, branch, commit, and case counts. Test an upload failure as well: it should remain visible while a failing test retains its original failure status.

A reliable adapter makes custom tests comparable across runs without hiding runner failures or counting the same execution twice.
