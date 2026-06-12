# Validation Summary: How to Build Alert Runbook Links

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus alerting rules and PromQL
- Prometheus Alertmanager Slack and webhook configuration
- Node.js JavaScript
- Python
- GitHub Actions
- Markdown fenced code blocks
- Mermaid diagrams
- URL query parameters

## Sources Consulted
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus `histogram_quantile()` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Node.js HTTP API documentation: https://nodejs.org/api/http.html
- Node.js URL and URLSearchParams documentation: https://nodejs.org/api/url.html
- Python `urllib.parse` documentation: https://docs.python.org/3/library/urllib.parse.html
- Python `re` documentation: https://docs.python.org/3/library/re.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitHub Script action documentation: https://github.com/marketplace/actions/github-script
- GitHub Flavored Markdown fenced code block specification: https://github.github.com/gfm/
- Mermaid syntax documentation: https://mermaid.js.org/

## Issues Found
- The PromQL histogram example passed raw classic histogram buckets directly to `histogram_quantile()`. Changed it to use `sum by (service, le) (rate(...[5m]))`, matching Prometheus guidance for classic histograms and preserving the `service` label used in annotations.
- The JavaScript URL builder categorized alert names case-sensitively, so the `HighLatencyCheckout` example did not produce the documented latency URL. Changed categorization to lowercase the alert name before matching.
- The JavaScript and Python URL normalization helpers treated any string starting with `http` as absolute. Changed them to accept only `http://` and `https://` URLs as already absolute.
- The nested Markdown runbook template used three-backtick fences inside a three-backtick outer fence and used language-tagged closing fences. Changed the outer fence to four backticks and fixed inner closing fences so the Markdown renders correctly.
- The frontend runbook page rendered URL-derived values with `innerHTML`, which made the example vulnerable to script injection. Reworked it to build DOM nodes with `textContent`, added `noopener noreferrer` to external links, handled invalid timestamps, and used `URLSearchParams` for generated observability links.
- The link validator did not consume response bodies and reported `NaN%` when no links were found. Added `res.resume()` and a zero-link pass-rate guard.
- The CI workflow uploaded and read `validation-report.json`, but the validator never wrote that file. Added `fs.writeFileSync()` to generate the report, and awaited the GitHub comment API call.
- The complete integration example used broad `http` prefix detection for absolute URLs. Changed it to the same `http://` or `https://` check.

## Review Notes
JavaScript and Python code blocks were syntax-checked locally. `promtool` was not installed in this environment, so PromQL and Alertmanager snippets were reviewed manually against the official Prometheus documentation.
