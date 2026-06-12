# Validation Summary: How to Monitor OPA Policy Decisions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Open Policy Agent (OPA)
- Rego
- Prometheus
- Grafana
- Kubernetes ServiceMonitor
- Fluentd
- Elasticsearch / Kibana
- JavaScript
- Go

## Sources Consulted
- OPA Decision Logs documentation: https://www.openpolicyagent.org/docs/management-decision-logs
- OPA Configuration reference: https://www.openpolicyagent.org/docs/configuration
- OPA Monitoring documentation: https://www.openpolicyagent.org/docs/monitoring
- OPA Extending OPA documentation: https://www.openpolicyagent.org/docs/extensions
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus histogram practices: https://prometheus.io/docs/practices/histograms/
- Grafana Time series panel documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- Prometheus Operator ServiceMonitor API reference: https://github.com/prometheus-operator/prometheus-operator/blob/main/Documentation/api-reference/api.md
- Fluentd tail input documentation: https://docs.fluentd.org/input/tail
- Fluentd parse section and regexp parser documentation: https://docs.fluentd.org/configuration/parse-section and https://docs.fluentd.org/parser/regexp
- Kubernetes logging architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/

## Issues Found
- The post listed non-existent or incorrect built-in OPA Prometheus metrics such as `http_request_count`, `opa_rego_query_eval_ns_total`, `opa_bundle_loaded_bytes`, and `opa_bundle_last_successful_activation`. Updated examples to use OPA's documented `http_request_duration_seconds` histogram series and status metrics such as `bundle_loaded_counter` and `last_success_bundle_activation`.
- The PromQL dashboard and alert examples used the incorrect metric names and handler labels. Updated the queries to use `http_request_duration_seconds_count` and `http_request_duration_seconds_bucket` with the documented `handler="v1/data"` label.
- The bundle stale alert compared `time()` in seconds with `last_success_bundle_activation` in Unix nanoseconds. Updated the expression to compare nanoseconds consistently.
- The post implied OPA policies can increment Prometheus counters directly. Reworded the section to explain that policies should expose decision details and counters should be exported by the application or decision-log pipeline.
- The Grafana dashboard used the legacy `graph` panel type. Updated the time-series panels to `timeseries`.
- The allow/deny dashboard and alert examples used non-built-in metrics without explanation. Updated them to use an example log-pipeline counter, `opa_decision_result_total`, and added notes that it must be exported separately.
- The Elasticsearch decision-log config implied OPA can send directly to Elasticsearch. OPA's decision-log service protocol sends gzipped JSON arrays to a log service endpoint, so the example was changed to a generic log collector.
- The Fluentd example tailed a shared `/var/log/opa/*.log` path that OPA was not writing to and parsed it as raw JSON. Updated the example to a DaemonSet tailing Kubernetes container logs with a CRI log-line parser.
- The decision-log masking example used an invalid list form for `mask_decision`. Updated it to the documented string path form and added `drop_decision` for sampling/drop behavior.
- The custom Go decision-log plugin example ignored JSON marshal errors and called an undefined helper. Added error handling and a stub backend function.
- The JavaScript correlation ID example called an undefined `uuid()` helper. Replaced it with `crypto.randomUUID()`.

## Review Notes
- The decision-log analysis queries assume decision logs are indexed as structured documents with fields matching the OPA event shape. Real Elasticsearch mappings and parser stages may need adjustment depending on the collector configuration.
- The `opa_decision_result_total` metric is intentionally presented as an exported custom/log-derived metric, not an OPA built-in metric.
