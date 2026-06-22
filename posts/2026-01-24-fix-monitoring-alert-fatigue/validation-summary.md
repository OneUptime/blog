# Validation Summary: How to Fix 'Monitoring Alert Fatigue' Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Monitoring and alerting practices
- Prometheus recording and alerting rules
- Prometheus Alertmanager routing and inhibition
- Python with pandas and NumPy
- JavaScript classes
- PostgreSQL SQL aggregation
- Mermaid flowcharts

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries best practices: https://prometheus.io/docs/practices/histograms/
- pandas DataFrame groupby API documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.groupby.html
- NumPy percentile documentation: https://numpy.org/doc/stable/reference/generated/numpy.percentile.html
- MDN JavaScript classes documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes
- PostgreSQL date/time functions documentation: https://www.postgresql.org/docs/current/functions-datetime.html
- PostgreSQL aggregate functions documentation: https://www.postgresql.org/docs/current/tutorial-agg.html
- PostgreSQL mathematical functions documentation: https://www.postgresql.org/docs/current/functions-math.html
- PostgreSQL conditional expressions documentation: https://www.postgresql.org/docs/current/functions-conditional.html
- Mermaid flowchart syntax documentation: https://mermaid.ai/open-source/syntax/flowchart.html

## Issues Found
- The alert audit code said duplicate alerts were returned when they fired together more than 50% of the time, but the implementation only returned pairs with more than 10 co-occurrences. Updated the comment to match the actual threshold.
- The dynamic threshold Python snippet imported `scipy.stats` but did not use it. Removed the unused dependency so the example only requires NumPy.
- The dynamic threshold Python snippet did not handle unsupported `method` values, which could lead to an unbound local variable error. Added a `ValueError` for unsupported methods.
- The Prometheus latency example compared `http_request_duration_seconds` directly against a baseline, which is not correct for a typical classic histogram metric. Updated the example to derive a p95 latency time series from `http_request_duration_seconds_bucket` with `histogram_quantile()` before applying rolling average and standard deviation recording rules.
- The JavaScript alert correlator called `sendNotification()` but did not define it. Added a minimal method so the class is internally consistent.
- The Alertmanager example used older `source_match`, `target_match`, `target_match_re`, and `match` fields instead of the current matcher list syntax. Updated it to `source_matchers`, `target_matchers`, and route `matchers`.
- The Alertmanager example referenced receivers without defining them and did not set a root route receiver. Added `default`, `pagerduty-critical`, and `null` receivers, plus a root receiver.
- The Alertmanager maintenance route appeared after the critical route, so critical maintenance alerts would match the critical route first. Moved the maintenance route before the critical route.

## Review Notes
Local syntax checks passed for both Python snippets with `python3 ast.parse`, the JavaScript snippet with `node --check`, and both YAML snippets with PyYAML. `promtool`, `amtool`, and `psql` were not installed in the local environment, so Prometheus, Alertmanager, and PostgreSQL details were verified against official documentation rather than local CLI validators.
