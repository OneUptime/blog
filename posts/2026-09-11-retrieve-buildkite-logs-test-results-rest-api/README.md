# How to Retrieve Buildkite Logs and Test Results Through the API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, REST API, CI/CD, Testing, Automation

Description: Fetch Buildkite job logs, JUnit artifacts, and Test Engine failures through documented REST endpoints with the correct IDs and scopes.

---

Buildkite logs and structured test results are separate data sources. A job log is captured command output. A JUnit artifact is a file uploaded by the job. Test Engine results come from a configured test collector and have their own API model.

Choose the source that matches the question. Use logs to investigate execution, artifacts to retrieve the original report, and Test Engine endpoints to query processed test runs and failures. A JSON wrapper around a log does not turn terminal output into structured test cases.

## Prepare the IDs and token scopes

Use a Buildkite REST API token with the scopes needed by the selected endpoints: `read_builds` for build details, `read_build_logs` for logs, `read_artifacts` for artifacts, and `read_suites` for Test Engine runs.

Supply the token through your secret environment and set nonsecret identifiers:

```bash
export BK_ORG='your-organization'
export BK_PIPELINE='your-pipeline'
export BK_BUILD_NUMBER='123'
: "${BK_API_TOKEN:?Set a REST API token through your secret environment}"

build_api="https://api.buildkite.com/v2/organizations/${BK_ORG}/pipelines/${BK_PIPELINE}/builds/${BK_BUILD_NUMBER}"
```

The build-scoped REST route uses the build number, not the build UUID. Test Engine's `build_id` filter uses the UUID. Keep both values rather than assuming they are interchangeable.

These examples use Bash, curl, and jq. They make read requests only; no agent registration token is needed.

## Inspect the jobs in the build

Fetch the build and list its command jobs:

```bash
curl --fail --silent --show-error \
  -H "Authorization: Bearer $BK_API_TOKEN" \
  "$build_api" > build.json

jq -r '.jobs[] | select(.type == "script") |
  [.id, .step_key, .state, .name] | @tsv' build.json
```

Choose the actual job UUID from that output:

```bash
export BK_JOB_ID='REPLACE_WITH_JOB_UUID'
```

A parallel step can have several jobs with the same `step_key`, and retries can create additional attempts. Select the specific job you intend to inspect or iterate over all relevant jobs while preserving their IDs in output filenames.

Build details provide context for interpreting logs: a skipped job, a queued job, and an executed failing job do not all have the same available output.

## Download plain-text or JSON logs

The [Jobs API](https://buildkite.com/docs/apis/rest-api/jobs) supports a build-scoped log endpoint:

```bash
curl --fail --silent --show-error \
  -H "Authorization: Bearer $BK_API_TOKEN" \
  -H 'Accept: text/plain' \
  "$build_api/jobs/$BK_JOB_ID/log" > "$BK_JOB_ID.log"
```

Without the plain-text header, the JSON representation contains a `content` field:

```bash
curl --fail --silent --show-error \
  -H "Authorization: Bearer $BK_API_TOKEN" \
  "$build_api/jobs/$BK_JOB_ID/log" > "$BK_JOB_ID-log.json"
jq -r '.content' "$BK_JOB_ID-log.json"
```

For recent output from a large log, the current API supports suffix byte ranges with `Accept: text/plain`:

```bash
curl --fail --silent --show-error \
  -H "Authorization: Bearer $BK_API_TOKEN" \
  -H 'Accept: text/plain' \
  -H 'Range: bytes=-65536' \
  "$build_api/jobs/$BK_JOB_ID/log" > "$BK_JOB_ID-tail.log"
```

The supported form is a suffix range, not an arbitrary start-end range. Handle empty logs and partial-content responses in a production client. A running job's log is also a snapshot, not proof that execution has finished.

## Retrieve an uploaded JUnit report

List finished artifacts from the chosen job:

```bash
curl --fail --silent --show-error --get \
  -H "Authorization: Bearer $BK_API_TOKEN" \
  --data-urlencode 'state=finished' \
  --data-urlencode 'path=reports/junit.xml' \
  --data-urlencode 'per_page=100' \
  "$build_api/jobs/$BK_JOB_ID/artifacts" > artifacts.json

jq -r '.[] | [.id, .path, .download_url] | @tsv' artifacts.json
```

Require one intended match before using its download URL:

```bash
download_url=$(jq -er '
  if length == 1 then .[0].download_url
  else error("Expected exactly one report artifact") end
' artifacts.json)

curl --fail --silent --show-error --location \
  -H "Authorization: Bearer $BK_API_TOKEN" \
  "$download_url" > junit.xml
```

The [Artifacts API](https://buildkite.com/docs/apis/rest-api/artifacts) provides the download URL. curl normally avoids forwarding authorization to another host during redirects; do not enable unrestricted credential forwarding. Validate artifact paths and retain job identity when collecting many reports.

An artifact must have been uploaded by the producer. The API cannot reconstruct a report that the test job never wrote or whose retention period has expired.

## Query Test Engine runs and failures

If your pipeline uploads results to Test Engine, find runs associated with the build UUID:

```bash
export BK_SUITE='your-suite'
build_uuid=$(jq -er '.id' build.json)
suite_api="https://api.buildkite.com/v2/analytics/organizations/${BK_ORG}/suites/${BK_SUITE}"

curl --fail --silent --show-error --get \
  -H "Authorization: Bearer $BK_API_TOKEN" \
  --data-urlencode "build_id=$build_uuid" \
  "$suite_api/runs" > runs.json
jq -r '.[] | [.id, .state, .result] | @tsv' runs.json
```

For a selected run UUID, retrieve `/runs/RUN_UUID/failed_executions` under `suite_api`. The [Runs API](https://buildkite.com/docs/apis/rest-api/test-engine/runs) returns structured failure information such as test name, location, duration, and failure reason.

A run can have a passed or failed result while uploads are still processing. Check its state and account for later uploads rather than treating the first result as a complete final report.

## Handle pagination and incomplete data

The list examples show one response page. Production collectors must follow the `Link` header's next-page URL or iterate documented page parameters until complete. Do this for artifacts, runs, and failed executions. Raising `per_page` does not remove pagination.

Preserve HTTP failures, inspect rate-limit headers, and retry transient failures with bounded backoff. Record an empty result distinctly from a failed API request. A dashboard that treats authentication failure as zero failed tests produces an unsafe success signal.

## Conclusion

Use job UUIDs for logs, scoped artifact queries for original reports, and build UUIDs to correlate Test Engine runs. Correct scopes, pagination, and processing-state checks make the retrieved evidence reliable.

## Official Documentation

- [Jobs API and logs](https://buildkite.com/docs/apis/rest-api/jobs)
- [Artifacts API](https://buildkite.com/docs/apis/rest-api/artifacts)
- [Test Engine Runs API](https://buildkite.com/docs/apis/rest-api/test-engine/runs)
- [REST pagination](https://buildkite.com/docs/apis/rest-api)
