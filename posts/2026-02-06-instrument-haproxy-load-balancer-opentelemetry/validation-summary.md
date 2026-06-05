# Validation Summary: How to Instrument HAProxy Load Balancer with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HAProxy
- HAProxy Prometheus exporter
- HAProxy Runtime API / stats socket
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Collector HAProxy receiver
- OpenTelemetry Collector filelog receiver
- Prometheus alerting rules
- W3C Trace Context

## Sources Consulted
- HAProxy Prometheus metrics documentation: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/prometheus/
- HAProxy Runtime API installation documentation: https://www.haproxy.com/documentation/haproxy-runtime-api/installation/
- HAProxy configuration manual: https://docs.haproxy.org/3.1/configuration.html
- HAProxy logging guide: https://www.haproxy.com/blog/introduction-to-haproxy-logging
- OpenTelemetry Collector receiver registry: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector Contrib HAProxy receiver: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/haproxyreceiver
- OpenTelemetry Collector Contrib filelog receiver: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/filelogreceiver
- OpenTelemetry Collector Stanza trace parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/trace.md
- OpenTelemetry Collector Stanza field path documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/field.md
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The HAProxy Prometheus frontend referenced `default_backend empty`, but no `empty` backend was defined. I replaced this with an explicit `http-request deny unless { path /metrics }` and added `no log`, matching HAProxy's documented Prometheus exporter pattern.
- The OpenTelemetry Collector HAProxy receiver was configured to scrape HAProxy's Prometheus `/metrics` endpoint. The official HAProxy receiver expects a HAProxy stats socket or HAProxy stats HTTP URL, so I added a HAProxy `stats socket` example and changed the receiver endpoint to `file:///var/run/haproxy.sock`.
- The post claimed the HAProxy receiver provided additional stats not available through Prometheus. Since the two paths can overlap, I changed the wording to explain that production setups usually choose one metric path to avoid duplicate HAProxy counters.
- The HAProxy logging example used `log /var/log/haproxy/haproxy.log`, which HAProxy treats as a syslog socket path rather than a regular output file. I changed it to `log /dev/log local0 info` and clarified that syslog should write `/var/log/haproxy/haproxy.log`.
- The structured log timestamp used `%t`, while the filelog parser expected an unbracketed HAProxy HTTP timestamp. I changed it to `%tr`, which is the HTTP request date field used in HAProxy's HTTP log format.
- The JSON log format did not escape string fields. I added HAProxy escape output flags to string fields that may contain unsafe characters.
- The filelog receiver moved attributes such as `attributes.http.status_code` using dotted field paths, which creates nested fields instead of semantic attribute keys containing dots. I changed these to bracket syntax, such as `attributes["http.status_code"]`.
- The filelog `trace_parser` example used unsupported `regex` fields directly under `trace_id` and `span_id`. I added a `regex_parser` step to extract `trace_id`, `span_id`, and `trace_flags`, then configured `trace_parser` with documented `parse_from` fields.
- The dashboard suggested p50/p95/p99 response-time panels, but the HAProxy metrics discussed in the post expose average and max response-time gauges rather than latency histograms. I changed the panel label to average and max response time.
- The backend error-rate alert divided a `code="5xx"` time series by a denominator that still retained the `code` label, which would not compute the intended all-response ratio. I changed it to aggregate numerator and denominator by `proxy`.
- The server-down alert used `haproxy_server_status == 0`, but HAProxy exposes one `haproxy_server_status` series per state label. I changed it to `haproxy_server_status{state="DOWN"} == 1`.

## Review Notes
Local `haproxy`, `otelcol`, and `otelcol-contrib` binaries were not available in the workspace, so I validated syntax and behavior against official documentation rather than running live configuration validation commands.
