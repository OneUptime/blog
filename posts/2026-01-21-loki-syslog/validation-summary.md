# Validation Summary: How to Ship Syslog to Loki

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Grafana Alloy
- Promtail
- Syslog, RFC3164, and RFC5424
- Rsyslog
- Syslog-ng
- Fluent Bit
- Vector
- LogQL
- Kubernetes
- NXLog

## Sources Consulted
- RFC 5424: The Syslog Protocol: https://www.rfc-editor.org/rfc/rfc5424
- RFC 3164: The BSD Syslog Protocol: https://www.rfc-editor.org/rfc/rfc3164
- Grafana Loki Promtail configuration reference: https://grafana.com/docs/loki/latest/send-data/promtail/configuration/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki LogQL metric queries: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki alerting rules: https://grafana.com/docs/loki/latest/alert/
- Grafana Alloy loki.source.syslog reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.syslog/
- Rsyslog omhttp output module documentation: https://docs.rsyslog.com/doc/configuration/modules/omhttp.html
- Syslog-ng loki() destination documentation: https://syslog-ng.github.io/admin-guide/070_Destinations/125_Loki/001_Loki_options.html
- Fluent Bit syslog input documentation: https://docs.fluentbit.io/manual/data-pipeline/inputs/syslog
- Fluent Bit Loki output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki
- Vector syslog source documentation: https://vector.dev/docs/reference/configuration/sources/syslog/
- Vector Loki sink documentation: https://vector.dev/docs/reference/configuration/sinks/loki/
- NXLog syslog integration documentation: https://docs.nxlog.co/integrations/format/syslog.html

## Issues Found
- Promtail was presented as a current recommended collector. Updated the prerequisites and Promtail section to note that Promtail is deprecated and has reached end-of-life, and to prefer Grafana Alloy for new deployments.
- The Promtail TCP example included an unnecessary protocol field and duplicated timestamp parsing that the syslog receiver already handles. Removed the protocol field, added `use_incoming_timestamp: true`, and removed the incorrect regex/timestamp pipeline from that receiver example.
- The Promtail examples mixed TCP receiver configuration with UDP exposure. Replaced the UDP Promtail receiver example with an rsyslog UDP listener that forwards to Promtail over TCP, and removed UDP ports from the TCP-only Promtail Kubernetes Service/Deployment examples.
- The rsyslog section was incorrectly titled as an `omkafka`/Kafka setup even though it used `omhttp`. Renamed it to `omhttp`, changed the content-type setting to `httpContentType`, and replaced the undefined retry ruleset with `action.resumeRetryCount`.
- The Promtail JSON file scraping example parsed `@timestamp` but did not apply it as the Loki entry timestamp. Added a `timestamp` pipeline stage using `RFC3339`.
- The syslog-ng examples manually built Loki push JSON without safe message escaping and used HTTP destination batching syntax. Replaced them with the current native `loki()` destination examples using labels, templates, timestamps, and batching options.
- The HA Kubernetes Service still exposed a UDP port for the Promtail receiver. Removed the invalid UDP service port.
- The monitoring examples used undocumented Promtail syslog metric names. Replaced them with Grafana Alloy's documented syslog component metrics.
- The missing-source alert used `absent(count_over_time(...))`; updated it to Loki's documented `absent_over_time({selector}[range])` function.
- The conclusion still recommended Promtail for direct ingestion. Updated it to recommend Grafana Alloy for new direct ingestion and Promtail only for existing deployments.

## Review Notes
Promtail examples are retained because the post already covers Promtail, but readers should treat them as migration-era examples. Future revisions should consider adding a full Grafana Alloy configuration as the primary direct-ingestion method.
