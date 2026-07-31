# Validation Summary: How to Monitor Infrastructure Jobs That Produce Metrics Only Once per Day

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Prometheus
- PromQL alert expressions and alerting rules
- Prometheus Node Exporter
- Node Exporter textfile collector
- Prometheus Pushgateway
- Prometheus text exposition format
- Bash and curl

## Sources Consulted

- [Prometheus instrumentation guidance for batch jobs](https://prometheus.io/docs/practices/instrumentation/#batch-jobs)
- [Prometheus alerting guidance for batch jobs](https://prometheus.io/docs/practices/alerting/#batch-jobs)
- [Prometheus guidance on when to use the Pushgateway](https://prometheus.io/docs/practices/pushing/)
- [Prometheus Pushgateway documentation and HTTP API](https://github.com/prometheus/pushgateway)
- [Prometheus Node Exporter textfile collector documentation](https://github.com/prometheus/node_exporter#textfile-collector)
- [Prometheus configuration reference for `honor_labels`](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus query operators](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Prometheus text exposition format](https://prometheus.io/docs/instrumenting/exposition_formats/)
- [curl command-line reference](https://curl.se/docs/manpage.html)

## Issues Found

- The textfile examples did not check whether `mktemp`, `printf`, or `mv` succeeded. In particular, a failed `printf` could be followed by an `mv` that atomically replaced a valid file with incomplete output. Added failure checks so the exit trap removes the temporary file and the final `.prom` file is replaced only after a complete write.
- The grace-period explanation said `for` was needed for atomic file replacement, even though replacing the destination with a same-filesystem rename does not create an absence window. Changed the explanation to cover initial deployment and transient collection delays.
- The Pushgateway example was not explicit that setting `tenant_reconcile_last_success_unixtime_seconds` to the current completion time is appropriate only after success. Clarified that the example is a successful-run push.
- `push_time_seconds` was described as the time of the last successful change to a grouping key. The Pushgateway updates it after every successful `POST` or `PUT`, including requests that do not change stored application metrics. Corrected the description to match the Pushgateway API semantics.

## Review Notes

- All six distinct PromQL expressions, the alert rule, the Pushgateway scrape configuration, and both metric exposition payloads were syntax-checked successfully with `promtool` 3.13.2.
- The Node Exporter flag, `.prom` file matching, lack of explicit timestamp support, and same-filesystem atomic rename pattern agree with the current Node Exporter documentation.
- The PromQL age, recent-failure, target-health, and per-target absence expressions use current operators and functions with the intended label matching.
- The Pushgateway `PUT`, `POST`, grouping-key deletion, generated push timestamp, and `honor_labels: true` explanations agree with current Prometheus and Pushgateway documentation.
- The examples are version-agnostic and use no deprecated Prometheus configuration fields or PromQL functions.
