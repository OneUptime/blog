# Validation Summary: How to Use k6 Thresholds for SLOs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana k6
- k6 thresholds
- k6 custom metrics: Counter, Gauge, Rate, Trend
- k6 scenarios, tags, checks, and custom summaries
- JavaScript
- GitHub Actions
- CI/CD performance testing

## Sources Consulted
- Grafana k6 Thresholds documentation: https://grafana.com/docs/k6/latest/using-k6/thresholds/
- Grafana k6 Built-in metrics reference: https://grafana.com/docs/k6/latest/using-k6/metrics/reference/
- Grafana k6 Trend metric documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/trend/
- Grafana k6 Gauge metric documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/gauge/
- Grafana k6 Rate metric documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/rate/
- Grafana k6 Counter metric documentation: https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/counter/
- Grafana k6 Tags and Groups documentation: https://grafana.com/docs/k6/latest/using-k6/tags-and-groups/
- Grafana k6 Scenarios advanced examples: https://grafana.com/docs/k6/latest/using-k6/scenarios/advanced-examples/
- Grafana k6 Custom summary documentation: https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/
- Grafana setup-k6-action documentation: https://github.com/grafana/setup-k6-action
- Grafana run-k6-action documentation: https://github.com/grafana/run-k6-action

## Issues Found
- The `abort-on-failure.js` example defined `http_req_duration` twice in the same `thresholds` object. In JavaScript, the later property overwrites the earlier one, and k6 documents that multiple thresholds for one metric must be combined under the same metric key. I merged the standard P95 threshold and the aborting P99 threshold into one `http_req_duration` array.
- The Gauge example used `vus: ['value>10']` with a comment saying this meant "Always have more than 10 VUs active." k6 Gauge threshold expressions use the `value` aggregation, and the built-in `vus` metric is the current active VU count, so that wording implied a stronger all-samples condition than the threshold expresses. I changed the example to `vus_max: ['value>=20']`, which still demonstrates Gauge threshold syntax against a built-in Gauge metric and matches the configured load.
- The GitHub Actions install step hardcoded k6 `v0.47.0`, which is outdated relative to the current k6 documentation and releases. I replaced the manual download with the official `grafana/setup-k6-action@v1`, which installs the latest k6 version by default.
- The abort-on-failure explanation said `abortOnFail` "stops test immediately." k6 evaluates aborting thresholds during the test, but the exact timing can vary, especially in cloud runs. I changed the wording to "can stop the test before completion."

## Review Notes
- All JavaScript code blocks passed `node --check --input-type=module` syntax validation.
- The GitHub Actions YAML block passed YAML parsing with PyYAML.
- k6 was not installed in the local environment, so I could not execute the example scripts with the k6 runtime. Runtime behavior was verified against official Grafana k6 documentation instead.
