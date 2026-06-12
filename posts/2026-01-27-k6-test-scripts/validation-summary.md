# Validation Summary: How to Write k6 Test Scripts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana k6
- JavaScript ES modules
- k6 HTTP API
- k6 checks, groups, thresholds, and metrics
- k6 lifecycle functions: setup, default, teardown, handleSummary
- k6 data parameterization with SharedArray and environment variables
- k6 execution context variables
- k6 jslib FormData and summary helpers

## Sources Consulted
- Grafana k6 Test lifecycle: https://grafana.com/docs/k6/latest/using-k6/test-lifecycle/
- Grafana k6 Options reference: https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- Grafana k6 HTTP Requests: https://grafana.com/docs/k6/latest/using-k6/http-requests/
- Grafana k6 HTTP post API: https://grafana.com/docs/k6/latest/javascript-api/k6-http/post/
- Grafana k6 Data Uploads: https://grafana.com/docs/k6/latest/examples/data-uploads/
- Grafana k6 open() API: https://grafana.com/docs/k6/latest/javascript-api/init-context/open/
- Grafana k6 Custom summary: https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/
- Grafana k6 Metrics: https://grafana.com/docs/k6/latest/using-k6/metrics/
- Grafana k6 Custom metrics: https://grafana.com/docs/k6/latest/using-k6/metrics/create-custom-metrics/
- Grafana k6 Counter, Gauge, Rate, and Trend API pages: https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/
- Grafana k6 SharedArray API: https://grafana.com/docs/k6/latest/javascript-api/k6-data/sharedarray/
- Grafana k6 execution API: https://grafana.com/docs/k6/latest/javascript-api/k6-execution/
- Grafana k6 Tags and Groups: https://grafana.com/docs/k6/latest/using-k6/tags-and-groups/

## Issues Found
- The opening script mixed `vus`/`duration` with `stages` while describing them as alternatives. I changed the example to use `stages` only so the configuration matches the surrounding explanation and the documented ramping-VUs shortcut.
- The file upload example called `open('./test-file.pdf', 'b')` inside the default function. k6 documents `open()` as init-context only, so I moved the file read to module scope and reused the loaded file in the VU function.
- The custom metric example recorded `__VU` in an `active_users` gauge, which stores VU identifiers rather than the number of active VUs. I imported `k6/execution` and changed the metric to record `exec.instance.vusActive`.
- The lifecycle section claimed scenario-specific initialization and per-VU setup/teardown behavior that k6 does not provide. I updated the wording and scenario comment to describe setup, teardown, and custom summaries accurately.
- The `handleSummary()` example accessed `data.setup_data`, which is not part of the documented summary object. I changed it to use `data.state.testRunDurationMs` and removed the summary's `testRunId` field.
- The summary helper import used `k6-summary/0.0.1`, while current official examples use `0.0.2`. I updated the import to `https://jslib.k6.io/k6-summary/0.0.2/index.js`.
- The best-practices section advised loading large files in `setup()`. Because regular `open()` is init-context only, I changed this to recommend the init context and SharedArray for large datasets.

## Review Notes
The remaining examples are illustrative and use placeholder API URLs and response shapes. They are syntactically consistent with k6 APIs, but real projects should adapt checks, thresholds, authentication, and JSON field assumptions to their actual API contracts.
