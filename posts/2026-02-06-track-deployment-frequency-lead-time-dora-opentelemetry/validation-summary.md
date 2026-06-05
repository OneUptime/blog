# Validation Summary: How to Track Deployment Frequency and Lead Time with OpenTelemetry DORA Metrics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry OTLP exporters
- OpenTelemetry Collector configuration
- GitHub Actions
- Git
- DORA software delivery metrics
- Python
- YAML

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python instrumentation guide: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- DORA software delivery performance metrics: https://dora.dev/guides/dora-metrics/
- DORA metrics history: https://dora.dev/insights/dora-metrics-history/
- DORA Quick Check benchmark ranges: https://dora.dev/quickcheck/
- Git `git-show` documentation: https://git-scm.com/docs/git-show
- GitHub Actions contexts documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- `actions/checkout` README: https://github.com/actions/checkout

## Issues Found
- The post used the older "four key metrics" framing for DORA. Updated it to reflect DORA's current five-metric software delivery model, while preserving the article's focus on deployment frequency and change lead time.
- The DORA benchmark category wording used older elite/high/medium/low labels. Replaced those with current benchmark range wording from DORA Quick Check-style response ranges.
- The GitHub Actions example used `python -c` with indented multi-line Python, which would raise an `IndentationError`. Replaced it with a `python3` heredoc.
- The GitHub Actions example read a shell variable from `os.environ` without exporting it. Changed the command to export `COMMIT_TIMESTAMP`.
- The f-string in the GitHub Actions inline Python used escaped quotes inside the f-string expression. Removed the escapes so the Python parses correctly.
- The GitHub Actions example used `pip` and `python`; changed these to `python3 -m pip` and `python3` for a more explicit runner command.
- The post described `git show -s --format=%cI` as the original commit creation time. Git documents `%cI` as the committer date in strict ISO 8601 format, so the wording was corrected.
- The batch deployment example called `record_deployment` once per commit, which would increment the deployment frequency counter once per commit instead of once per production deployment. Added a `count_deployment` option and used `count_deployment=False` for per-commit lead-time records.
- The batch deployment snippet referenced `record_deployment` without importing it. Added the missing import.
- The Collector transform processor example attempted to classify lead time using a datapoint attribute that the metric did not emit, and the transform processor was not included in the metrics pipeline. Removed the non-working transform example and kept a valid batch-processing Collector pipeline.
- The OTLP exporter endpoint placeholder lacked a scheme. Updated it to `https://your-backend:4317` to match OTLP endpoint configuration expectations.
- Removed unused `time` and `os` imports from the Python module.

## Review Notes
- The Python and YAML snippets were parsed locally after edits.
- The examples intentionally use custom DORA metric and attribute names; there is no official OpenTelemetry DORA semantic convention for these exact metric names.
