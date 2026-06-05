# Validation Summary: How to Use Error Budget Policies (Green/Yellow/Red) with OpenTelemetry Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- Prometheus recording rules and alerting rules
- PromQL
- Python
- Requests
- GitHub Actions
- SRE error budget policies

## Sources Consulted
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- GitHub Actions workflow commands documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- Requests quickstart documentation: https://requests.readthedocs.io/en/latest/user/quickstart/
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Python enum documentation: https://docs.python.org/3/library/enum.html

## Issues Found
- The Prometheus recording rule used `sum(...)` without preserving the `service` label, while the Python example queried `slo:error_budget:remaining_ratio{service="payment-service"}`. I changed the recording rule to use `sum by (service) (...)` so the generated series can be queried by service.
- The post described the recording rules as producing a budget status label, but the YAML creates recording-rule series. I changed the wording to "budget status series."
- The remaining-budget expression was documented as a 0.0 to 1.0 scale but could return negative values after the error budget was exhausted. I wrapped the expression in `clamp_min(..., 0)` so exhausted budgets report zero instead of negative remaining budget.
- The zone indicator recording rules claimed to return 1 or 0, but PromQL comparisons without the `bool` modifier filter out false series instead of returning `0`. I added `bool` to the green and red rules and used multiplication of boolean comparisons for the yellow rule.
- The Python example treated an empty Prometheus result as "no errors recorded" and returned a full budget. Empty results can also mean missing metrics, wrong labels, or a recording-rule mismatch, so I changed it to raise an error instead.
- The Python example decoded the Prometheus API response without checking HTTP status. I added `response.raise_for_status()` before parsing JSON, matching Requests guidance.

## Review Notes
The Markdown-extracted Python snippet compiles successfully, and the YAML snippets parse successfully with PyYAML. `promtool` is not installed in this workspace, so Prometheus rule syntax was reviewed against official Prometheus documentation but not checked with `promtool check rules`.
