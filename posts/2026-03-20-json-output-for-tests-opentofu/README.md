# How to Use JSON Output for Tests in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, JSON Output, CI/CD, Automation

Description: Learn how to use OpenTofu's JSON test output format to integrate test results with CI dashboards, notification systems, and custom reporting tools.

## Introduction

By default, `tofu test` prints human-readable output to the terminal. For CI/CD pipelines and automated tooling, machine-readable JSON output is often preferable. OpenTofu supports JSON output via the `-json` flag, producing structured results that are easy to parse and forward to dashboards or alerting systems.

## Enabling JSON Output

```bash
# Output results as JSON to stdout

tofu test -json

# Save JSON output to a file
tofu test -json | tee test-results.json

# Combine with verbose flag for detailed output
tofu test -json -verbose
```

## JSON Output Structure

Each line of JSON output is a separate event object. The `type` field identifies the event kind. Key test-related event types include:

| Type | Description |
|---|---|
| `test_abstract` | Discovered test files and `run` blocks at the start of execution |
| `test_file` | A test file status update |
| `test_run` | A `run` block status update |
| `test_plan` | Plan output for a `run` block when `-verbose` is enabled |
| `test_state` | State output for a `run` block when `-verbose` is enabled |
| `test_summary` | Overall suite summary |
| `test_cleanup` | Cleanup details when OpenTofu leaves resources behind |
| `test_interrupt` | Interrupt and cleanup warning details |
| `diagnostic` | An error or warning message associated with a file or `run` block |

### Example: Successful Run

```json
{
  "type": "test_run",
  "@level": "info",
  "@message": "  \"creates_bucket\"... pass",
  "@module": "tofu.ui",
  "@timestamp": "2026-03-20T10:00:01.000000Z",
  "@testfile": "tests/s3.tftest.hcl",
  "@testrun": "creates_bucket",
  "test_run": {
    "path": "tests/s3.tftest.hcl",
    "run": "creates_bucket",
    "status": "pass"
  }
}
```

### Example: Failed Assertion

When an assertion fails, OpenTofu emits a `test_run` event with `status` set to `fail` or `error`, followed by one or more `diagnostic` events with the details:

```json
{
  "type": "diagnostic",
  "@level": "error",
  "@message": "Error: Test assertion failed",
  "@module": "tofu.ui",
  "@timestamp": "2026-03-20T10:00:05.000000Z",
  "@testfile": "tests/s3.tftest.hcl",
  "@testrun": "creates_bucket",
  "diagnostic": {
    "severity": "error",
    "summary": "Test assertion failed",
    "detail": "Bucket name does not match input variable"
  }
}
```

## Parsing JSON Output in Shell

Use `jq` to extract just the failures for a quick summary:

```bash
#!/usr/bin/env bash
# Extract failed test names from JSON output

tofu test -json \
  | jq -r 'select(.type == "test_run" and (.test_run.status == "fail" or .test_run.status == "error"))
           | "\(.test_run.path)::\(.test_run.run)"'
```

Count total passes, failures, and errors:

```bash
tofu test -json | jq -s '
  [.[] | select(.type == "test_run")] as $runs
  | {
      total: ($runs | length),
      passed: ($runs | map(select(.test_run.status == "pass")) | length),
      failed: ($runs | map(select(.test_run.status == "fail")) | length),
      errored: ($runs | map(select(.test_run.status == "error")) | length)
    }
'
```

## Integrating with GitHub Actions

GitHub Actions can consume JUnit XML, which many tools generate from OpenTofu's JSON output:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: opentofu/setup-opentofu@v2
        with:
          tofu_wrapper: false

      - name: Run tests with JSON output
        run: tofu test -json > test-results.json
        continue-on-error: true

      - name: Convert to JUnit format
        run: |
          # Use a converter script or tool that transforms OpenTofu JSON events into JUnit XML
          cat test-results.json | python3 scripts/tofu_json_to_junit.py > junit.xml

      - name: Publish test results
        uses: EnricoMi/publish-unit-test-result-action@v2
        with:
          files: junit.xml
```

## Sending Failures to Slack

A simple script that posts a Slack notification when tests fail:

```bash
#!/usr/bin/env bash
# notify-on-failure.sh

RESULTS=$(tofu test -json || true)
FAILED=$(printf '%s\n' "$RESULTS" \
  | jq -rs 'map(select(.type == "test_run" and (.test_run.status == "fail" or .test_run.status == "error"))
               | .test_run.run)
              | join(", ")')

if [ -n "$FAILED" ]; then
  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "{\"text\": \"OpenTofu tests failed: $FAILED\"}"
fi
```

## Conclusion

JSON output turns `tofu test` into a first-class citizen of your observability stack. Pipe it into dashboards, ticket systems, or Slack-making infrastructure test failures as visible as application test failures.
