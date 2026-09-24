# Validation Summary: How to Total Counter Increases over a Grafana Dashboard Range

## Status

validated

## Post Type

Technical guide with PromQL examples and an HTTP API command.

## Technologies Covered

- Prometheus counters, scraping, recording rules, and HTTP API
- PromQL aggregation, increase(), rate(), and vector matching
- Grafana Stat panels, dashboard variables, instant queries, and reducers
- curl and jq
- HA collector deduplication

## Sources Consulted

- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/#increase
- Prometheus query operators: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query basics, range selectors, and query performance: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus implementation of counter extrapolation and sample handling: https://raw.githubusercontent.com/prometheus/prometheus/main/promql/functions.go
- Grafana Prometheus query editor: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana Prometheus template variables and rate interval guidance: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana global variables: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/global-variables/
- Grafana Add variables page, checked as the original reference: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Grafana calculation types: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/calculation-types/
- Thanos query deduplication: https://thanos.io/tip/components/query.md/
- curl command reference: https://curl.se/docs/manpage.html
- jq object construction and field access: https://jqlang.org/manual/
- Installed curl help output for --fail, --silent, --show-error, --get, and --data-urlencode.

## Issues Found

1. **Incorrect label-loss explanation for `or vector(0)`.** The original warning said the expression could erase service labels. PromQL set union preserves the left-hand series and adds unmatched right-hand series. Changed the warning to describe the possible addition of an unlabeled zero alongside service-labeled results. The warning about masking missing collection remains valid.
2. **Global-variable reference pointed to the wrong current page.** The linked Add variables page describes creating variables; the built-in range variables are documented on the separate Global variables page. Updated only this URL.
3. **Overstated effect of changing the dashboard range.** A different measurement interval does not guarantee a different numeric total, for example when both intervals contain no requests. Replaced the claim that the total should change with a statement that the measured interval changes while the result can remain the same.

## Review Notes

- Both displayed PromQL expressions are syntactically valid after Grafana substitutes its duration variable. The examples assume the metric and service/job/status labels exist in the reader's instrumentation.
- Confirmed per-series reset handling before aggregation, counter-only use of increase(), extrapolated fractional counts, and the distinction between counts and per-second rates. Applying increase() to recorded rates would not produce a valid request total.
- Confirmed that instant queries evaluate once and range queries evaluate repeatedly. Summing rolling one-hour increases therefore reuses observations across overlapping windows. Grafana's Total reducer sums field values.
- Confirmed the roles of $__range and $__rate_interval. The existing Query Inspector advice is appropriate because the actual duration and evaluation timestamp must match when reproducing results outside Grafana.
- Checked the API endpoint, query and RFC3339 time parameters, URL encoding, and optional warnings/infos fields. Verified the installed curl flags and executed the exact jq filter against a representative JSON response; absent annotations correctly appear as null.
- Reviewed missing-series limitations, duplicate replica counting, and the performance implications of broad long-range queries. Deduplication configuration depends on the queried backend. The text appropriately avoids claiming scraped counters are exact transaction accounting.
- No version-specific or deprecated API usage was identified in the examples. Current official documentation was consulted on 2026-09-24.
- Validation was based on documentation, source inspection, and local command checks. No live Grafana dashboard or populated Prometheus backend was used, so actual metric availability and deployment-specific panel behavior were not tested.
