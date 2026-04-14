# Validation Summary: How to Conduct Dapr Load Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation, pub/sub, state management APIs)
- k6 (load testing tool)
- hey (HTTP load generator)
- Python (for result analysis)
- kubectl (for monitoring pods)

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- hey CLI documentation and source: https://github.com/rakyll/hey
- hey CSV output source code: https://github.com/rakyll/hey/blob/master/requester/print.go
- k6 documentation for HTTP requests, options, thresholds: https://grafana.com/docs/k6/latest/
- Dapr Service Invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Pub/Sub API: https://docs.dapr.io/reference/api/pubsub_api/

## Issues Found

### 1. Incorrect `hey` output flag (`-output csv` → `-o csv`)
**What was wrong:** The `hey` command used `-output csv` to specify CSV output format. The correct flag is `-o csv`.
**What was changed:** Replaced `-output csv` with `-o csv`.
**Why:** `-output` is not a valid hey flag. The tool uses `-o` for output format selection.

### 2. `hey` flags placed after URL
**What was wrong:** The `-output csv` flag was positioned after the URL argument. In hey, the URL must be the last argument — all flags must precede it.
**What was changed:** Moved `-o csv` before the URL so the URL is the final argument in the command.
**Why:** hey follows the `hey [options...] <url>` convention. Flags after the URL are not parsed correctly.

### 3. Incorrect Dapr state API request body format
**What was wrong:** The hey command used `-d '{"value": "test-data"}'` as the request body for the Dapr state save API. This is incorrect — the API requires a JSON array of objects, each with a `key` and `value` field.
**What was changed:** Updated the body to `-d '[{"key": "load-test-key", "value": "test-data"}]'`.
**Why:** The Dapr state save API (`POST /v1.0/state/<storename>`) requires the body to be a JSON array where each element has at minimum `key` and `value` fields. A bare object without a `key` field would be rejected by the API.

### 4. Python CSV parser does not skip hey's header row
**What was wrong:** The Python analysis script read all rows from the CSV file, including the header row that hey outputs (`response-time,DNS+dialup,...`). Attempting `float("response-time")` would raise a `ValueError`.
**What was changed:** Added `reader = csv.reader(f)` followed by `next(reader)` to skip the header row before processing data rows.
**Why:** hey's CSV output includes a header row. The script must skip it before parsing numeric values.

## Review Notes
- The k6 scripts for service invocation and pub/sub testing are correct and use current k6 APIs.
- The Dapr API endpoints for service invocation (`/v1.0/invoke/...`) and pub/sub (`/v1.0/publish/...`) are correct.
- The k6 threshold syntax (`p(99)<500`, `rate<0.01`) is valid.
- `statistics.quantiles(times, n=100)[98]` correctly computes P99 in Python 3.8+.
- The `hey` state test sends the same key on every request, which is fine for a write-throughput benchmark but would overwrite the same key repeatedly. This is noted but not changed as it is a valid load testing approach.
