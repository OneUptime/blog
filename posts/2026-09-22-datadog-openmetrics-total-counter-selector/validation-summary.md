# Validation Summary: How to Fix Datadog OpenMetrics Counters Skipped by `_total` Selectors

## Status
validated

## Post Type
Technical troubleshooting guide with Agent commands, YAML configuration, and an OpenMetrics exposition example.

## Technologies Covered
- Datadog Agent and the OpenMetrics integration in latest and legacy modes
- Prometheus and OpenMetrics counter families and samples
- Datadog monotonic count submission and metric naming
- YAML configuration, shell commands, and curl HTTP requests

## Sources Consulted
- Datadog OpenMetrics integration: https://docs.datadoghq.com/integrations/openmetrics/
- Datadog latest and legacy integration versioning: https://docs.datadoghq.com/integrations/guide/versions-for-openmetrics-based-integrations/
- Datadog Prometheus/OpenMetrics metric type mapping: https://docs.datadoghq.com/integrations/guide/prometheus-metrics/
- Official OpenMetrics integration configuration reference: https://github.com/DataDog/integrations-core/blob/master/openmetrics/datadog_checks/openmetrics/data/conf.yaml.example
- Official counter transformer implementation: https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/transformers/counter.py
- Official metric selector and transformer implementation: https://github.com/DataDog/integrations-core/blob/master/datadog_checks_base/datadog_checks/base/checks/openmetrics/v2/transform.py
- OpenMetrics specification, including metric family suffixes, gauges, counter samples, and text exposition: https://github.com/prometheus/OpenMetrics/blob/main/specification/OpenMetrics.md
- Datadog Agent commands: https://docs.datadoghq.com/agent/configuration/agent-commands/
- Datadog custom Agent metric submission and monotonic counts: https://docs.datadoghq.com/metrics/custom_metrics/agent_metrics_submission/
- curl manual: https://curl.se/docs/manpage.html

## Issues Found
- The post categorically called a gauge ending in `_total` an instrumentation problem. The OpenMetrics specification discourages names that can be confused with type-specific suffixes, but that name alone does not establish that a gauge should be a counter. Changed the sentence to identify misleading naming while preserving the importance of the declared type.
- The post stated that latest-mode selectors are regexes. The implementation supports exact-name lookup as well as regular-expression matching. Changed the sentence to explicitly describe both supported forms and retain the warning that patterns are not shell globs.

## Review Notes
- Confirmed the documented Agent 7.32.0 behavior: select a counter without its `_total` sample suffix. The counter transformer adds `.count` to the configured destination base name, so the examples produce `shop.requests.count` and `shop.checkout_requests.count`; mapping to `requests.count` would append another `.count`.
- Confirmed that `openmetrics_endpoint` selects latest mode and `prometheus_url` selects legacy mode. Guidance should be compared with the integration version actually deployed, as the linked GitHub sources track a moving branch.
- Checked the configuration fields and mapping forms against the official example. The reference specifies prefix removal before configuration-name matching and supports metric exclusions and label-based exclusions. The transformer skips unknown native types unless an appropriate type is configured.
- Parsed both YAML snippets successfully with PyYAML. Parsed the exposition with the Prometheus Python client's OpenMetrics parser: it produces a `checkout_requests` counter family containing the `checkout_requests_total` sample with value 900 and the POST method label. TYPE/HELP metadata and the EOF terminator are consistent with OpenMetrics text exposition.
- Verified `configcheck`, `check`, and `status` against the Agent command documentation. The displayed sudo commands assume a Linux host installation with the Agent binary available; the example exporter hostname must resolve from the Agent's network environment.
- Verified curl's header, silent, show-error, and fail-with-body options. `--fail-with-body` requires curl 7.76.0 or newer. Requesting OpenMetrics through Accept does not guarantee that every exporter supports that representation.
- Confirmed that monotonic count submission computes differences between cumulative samples. The recommendation to collect multiple intervals is appropriate, and producer resets and Agent state resets are distinct events. Dashboard aggregation and rate/count display settings also affect the displayed values.
- Checked the article's technical reference links against official documentation or source content. No deprecated API or configuration option was identified in the examples.
- Validation consisted of documentation/source review and local syntax/parser checks. No running Datadog Agent, live checkout exporter, or Datadog backend was used, so collection and dashboard delivery were not tested end to end.
