# Validation Summary: How to Create Performance Baseline Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (`statistics` standard library, `scipy.stats`, `numpy`, `requests`, `argparse`)
- Welch's t-test (`scipy.stats.ttest_ind` with `equal_var=False`) and t-distribution confidence intervals (`scipy.stats.t.ppf`)
- k6 load testing CLI (`k6 run`, summary export)
- GitHub Actions workflows (`actions/checkout@v4`, `$GITHUB_OUTPUT`)
- Docker Compose (`docker-compose.perf.yml`)
- AWS S3 CLI (`aws s3 cp`) for baseline artifact storage
- Slack webhooks (Block Kit message payloads)
- PagerDuty Events API v2 (`/v2/enqueue`)
- Mermaid `flowchart TD` syntax
- YAML configuration

## Sources Consulted
- Python `statistics` module docs — https://docs.python.org/3/library/statistics.html
- SciPy `ttest_ind` (Welch's t-test) — https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html
- SciPy `t.ppf` / Student's t distribution — https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.t.html
- SciPy `sem` (standard error of the mean) — https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.sem.html
- k6 JSON real-time output format — https://grafana.com/docs/k6/latest/results-output/real-time/json/
- k6 end-of-test summary / `handleSummary` and `--summary-export` — https://grafana.com/docs/k6/latest/results-output/end-of-test/custom-summary/
- k6 options reference — https://grafana.com/docs/k6/latest/using-k6/k6-options/reference/
- GitHub Actions deprecation of `set-output` — https://github.blog/changelog/2022-10-11-github-actions-deprecating-save-state-and-set-output-commands/ and https://github.com/orgs/community/discussions/35994
- GitHub Actions `$GITHUB_OUTPUT` environment file — https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-output-parameter
- `actions/checkout@v4` — https://github.com/actions/checkout
- PagerDuty Events API v2 — https://developer.pagerduty.com/docs/events-api-v2/trigger-events/
- Slack Block Kit — https://api.slack.com/block-kit
- Mermaid flowchart syntax — https://mermaid.js.org/syntax/flowchart.html

## Issues Found

1. **Deprecated GitHub Actions `::set-output` workflow command** (in `scripts/analyze_performance.py`). The post used `print(f"::set-output name=regression_detected::...")`. GitHub deprecated `set-output` on 2022-10-11 and it has since been disabled by default; the modern mechanism is appending to the `$GITHUB_OUTPUT` environment file. Replaced with a conditional write to `os.environ['GITHUB_OUTPUT']`, and added the corresponding `import os`.

2. **Mismatch between `k6 --out json=` output format and the analysis script's expected structure.** The post's workflow ran `k6 run --out json=results.json …` and the Python script read it as `metrics.http_req_duration["p(95)"]`. But `--out json` produces a line-delimited stream of individual `Point`/`Metric` events — it does not contain aggregated percentiles. The aggregated structure the script reads is what `--summary-export` (and `handleSummary()`) produce. Switched the workflow step to `k6 run --summary-export=results.json …` and added a comment explaining the choice. (Left a forward-looking note in Review Notes about `handleSummary()`.)

3. **Misleading docstring on `is_regression_significant`.** The docstring said "Returns True if current performance is significantly worse than baseline" but the function actually returns a dict whose `is_significant` field carries that boolean. Reworded the docstring to match the actual return type.

## Review Notes

- The statistical reasoning is sound. Coefficient of variation (`stdev/mean`), the use of medians for robustness against outliers, the two-tailed-to-one-tailed p-value conversion (`p/2 if t<0 else 1 - p/2` for the alternative "current > baseline" when `ttest_ind` is called as `ttest_ind(baseline, current)`), and the use of `equal_var=False` for Welch's t-test all check out against SciPy's documentation. Modern SciPy (≥1.6) also supports the `alternative=` keyword on `ttest_ind`, which would let the reader skip the manual conversion — worth a future mention but not incorrect as written.
- `--summary-export` is functional but officially "legacy" in current k6 docs; the recommended modern path is `handleSummary(data)` inside the test script, which lets you emit any shape of JSON you want. The current example is correct and self-contained, but future readers may want to migrate.
- Slack Block Kit message and the PagerDuty Events API v2 payloads both match current schemas (`routing_key`, `event_action: "trigger"`, `payload.severity`, `payload.summary`, `payload.source`, `custom_details`).
- The post uses `docker-compose` (v1 syntax) in the workflow rather than `docker compose` (v2 plugin). Both still work on `ubuntu-latest` runners today, but Docker Compose v1 reached end of life in mid-2023; a future revision could swap to `docker compose`.
- `actions/checkout@v4` is current.
- The Mermaid `flowchart TD` syntax (node shapes, edge labels, diamond decisions) is valid.
