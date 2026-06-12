# Validation Summary: How to Create Alert Gap Analysis

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python 3
- PostgreSQL SQL
- Prometheus alerting rules
- PromQL
- YAML
- PyYAML
- SLO burn-rate alerting
- Mermaid diagrams

## Sources Consulted
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Python typing documentation: https://docs.python.org/3/library/typing.html
- PostgreSQL value expressions documentation, including aggregate `FILTER`: https://www.postgresql.org/docs/current/sql-expressions.html
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus query functions documentation for `histogram_quantile`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Google SRE Workbook, "Alerting on SLOs": https://sre.google/workbook/alerting-on-slos/
- PyYAML documentation: https://pyyaml.org/wiki/PyYAMLDocumentation

## Issues Found
- The incident gap SQL counted `alerts_after_impact`, but the `LEFT JOIN` only included alerts up to `user_impact_started_at`, making `minutes_before_impact < 0` impossible. Updated the join window to include alerts until `detected_at`, with a 30-minute fallback after impact.
- The SLO burn-rate recommendation table mixed short and long windows and used hour values where the code fields were minute-based. Updated the recommended windows to the Google SRE multiwindow guidance: 1h/5m at 14.4x, 6h/30m at 6x, 1d/2h at 3x, and 3d/6h at 1x.
- The SLO burn-rate calibration used the short window to calculate expected burn rate. Updated it to use the long window, which is the window tied to the stated budget consumption.
- The example `BurnRateAlert` used 60 minutes as the short window and 360 minutes as the long window for a 14.4x burn alert. Updated it to 5 minutes and 60 minutes to match the multiwindow SLO pattern.
- The downstream latency PromQL example used `histogram_quantile` over raw classic histogram bucket rates without aggregation. Updated it to aggregate with `sum by (le)` so the required `le` label is preserved for classic histogram quantile calculation.

## Review Notes
- All Python code blocks were syntax-checked with Python 3.12.3 and compiled successfully.
- The Python snippets use built-in generic annotations such as `list[str]`, so they require Python 3.9 or newer.
