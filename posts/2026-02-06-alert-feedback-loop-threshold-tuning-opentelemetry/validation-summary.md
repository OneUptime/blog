# Validation Summary: How to Build an Alert Feedback Loop That Tunes Thresholds Based

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry metrics
- Prometheus HTTP API and PromQL
- Prometheus alerting rule files
- Python
- NumPy
- httpx
- PyYAML
- GitHub Actions scheduled workflows
- GitHub CLI

## Sources Consulted
- Python datetime documentation: https://docs.python.org/3/library/datetime.html
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Prometheus exporter specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- GitHub Actions schedule event documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- GitHub CLI `gh pr create` manual: https://cli.github.com/manual/gh_pr_create

## Issues Found
- The baseline calculator claimed to account for day-of-week variation but only grouped by hour of day. Updated the snippet to bucket samples by both weekday and hour.
- The baseline calculator used `datetime.utcnow()` and local-time `datetime.fromtimestamp()`. Updated it to use timezone-aware UTC datetimes, matching current Python guidance and avoiding local timezone drift.
- The timezone-aware query timestamps initially needed RFC3339-compatible formatting. The snippet now serializes UTC timestamps with a single `Z` suffix for Prometheus `query_range`.
- The threshold analyzer referenced `AlertOutcome` without importing it in that file's snippet. Added the import from `alert_outcome_tracker`.
- The threshold proposer used `datetime.utcnow()` without importing `datetime`. Added the correct import and switched to timezone-aware UTC.
- The generated Prometheus alert rule YAML used a top-level `rules` key. Prometheus rule files require `groups`, each containing `rules`, so the generated YAML now includes a rule group.
- The PromQL error-rate expression divided per-status series directly, which would not produce a total error-rate ratio. Updated it to divide summed 5xx request rates by summed total request rates.
- The PromQL example used a generic `status_code` label. Updated it to `http_response_status_code`, the Prometheus-compatible form of the current OpenTelemetry HTTP response status code attribute under underscore name translation.

## Review Notes
The GitHub Actions cron syntax and `gh pr create --title --body` usage are valid. The Prometheus/OpenTelemetry metric-name translation can vary by exporter configuration, especially with newer UTF-8 metric-name support, so the PromQL example assumes classic underscore escaping with suffixes.
