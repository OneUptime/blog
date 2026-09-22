# Validation Summary: How to Rename OpenMetrics Metric Prefixes in Datadog Without Breaking Include Rules

## Status
validated

## Post Type
Technical configuration and troubleshooting guide.

## Technologies Covered
- Datadog Agent and the latest-mode OpenMetrics integration
- OpenMetrics and Prometheus metric exposition
- YAML configuration and regular expressions
- Metric mappings, counters, gauges, namespaces, and label sharing
- Linux Agent diagnostic commands

## Sources Consulted
- Datadog OpenMetrics integration documentation: https://docs.datadoghq.com/integrations/openmetrics/
- Official OpenMetrics configuration example: https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example
- Datadog OpenMetrics v2 scraper implementation: https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/scraper/base_scraper.py
- Datadog metric selector and transformer implementation: https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/transform.py
- Datadog shared-label implementation: https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/labels.py
- Prometheus and OpenMetrics metric type mapping: https://docs.datadoghq.com/integrations/guide/prometheus-metrics/
- Datadog Agent commands: https://docs.datadoghq.com/agent/configuration/agent-commands/
- Troubleshooting Agent checks: https://docs.datadoghq.com/agent/troubleshooting/agent_check_status/
- OpenMetrics 1.0 specification: https://prometheus.io/docs/specs/om/open_metrics_spec/

## Issues Found
1. **Regex mapping silently discarded the destination name.** The example used `'^requests$': http.requests`. The upstream selector implementation removes the configured name for regex entries and builds the transformer with the matched family name. Changed the entry to `requests: http.requests` and explained that renaming requires an exact family name. This preserves `commerce.http.requests.count`.
2. **The exposition example omitted its required format context.** The counter TYPE line names the OpenMetrics family without `_total`, while its sample includes `_total`. The scraper chooses its parser from the response content type unless configured otherwise. Specified that the shown payload is served as `application/openmetrics-text; version=1.0.0; charset=utf-8`, so readers do not inadvertently serve it as Prometheus text and obtain different parsing behavior.
3. **The static configuration rollout omitted activation.** Diagnostic commands alone do not reload the running Agent's static configuration. Added the instruction to restart the Agent after editing that configuration, and identified the command example as Linux-specific.

## Review Notes
- Confirmed that `openmetrics_endpoint` selects latest mode; `prometheus_url` selects legacy mode. The reviewed behavior is scoped to latest mode.
- Confirmed prefix removal occurs on parsed family names before exclusion, selection, and shared-label lookup. Families without the prefix remain unchanged. Label renaming is handled separately by `rename_labels`.
- Confirmed the exact mappings, destination namespace, default counter `.count` suffix, and unchanged gauge base name. Counter deltas require successive observations; histogram and summary output depends on type-specific settings.
- Confirmed regex inclusion/exclusion semantics and the risk of collecting unrelated families with broad patterns. Prefix removal can cause distinct source families to share a destination name; avoiding colliding metric contexts is appropriate.
- Confirmed `configcheck`, `check openmetrics`, and `status` command syntax against official Agent documentation. No Agent service was restarted or production check executed during this review.
- Parsed every YAML example with PyYAML and the exposition example with the Python OpenMetrics parser. Verified the expected counter and gauge family names.
- Exercised the downloaded upstream metric-selector class with transformer compilation stubbed to expose the selected destination name. Verified that the original regex mapping loses the rename and both corrected exact-name mappings retain `http.requests`. This is a focused selector check, not a full Datadog ingestion test.
- The referenced configuration, scraper, and mapping URLs resolve to the intended official resources. GitHub master links are moving references rather than a pinned release.
- Temporary namespaces and retaining old queries are appropriate migration advice. Changing destination metric names does not transfer existing history. No live Datadog account or exporter was available for end-to-end verification.
