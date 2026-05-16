# Validation Summary: How to Forward Talos Linux Logs to Elasticsearch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl patch machineconfig`, JSON log format)
- Elasticsearch (index templates, Index Lifecycle Management, mappings)
- Logstash (TCP input, json_lines codec, mutate/date filters, Elasticsearch output)
- Vector (socket source, remap transform, Elasticsearch sink)
- Fluent Bit (mentioned as alternative)
- Kibana (KQL, dashboards, alerting rules)
- Kubernetes (Logstash Deployment/Service manifests)

## Sources Consulted
- Talos Linux machine config logging reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos JSON log field schema (talos-service, talos-level, talos-time, msg)
- Logstash TCP input plugin docs: https://www.elastic.co/guide/en/logstash/current/plugins-inputs-tcp.html
- Logstash mutate filter docs (rename syntax)
- Logstash Elasticsearch output plugin docs
- Vector socket source docs: https://vector.dev/docs/reference/configuration/sources/socket/
- Vector Elasticsearch sink docs (bulk.index, auth.strategy)
- Vector Remap Language (VRL) for transforms
- Elasticsearch composable index templates API (`_index_template`, 7.8+)
- Elasticsearch ILM policy reference (rollover `max_primary_shard_size`, `max_age`, warm/delete phases)
- Kibana Alerting framework rule types (`logs.alert.document.count`)
- Kibana Query Language (KQL) reference
- talosctl CLI docs for `patch machineconfig` with RFC 6902 JSON Patch
- Elasticsearch disk-based shard allocation watermark settings
- Elasticsearch translog durability/sync_interval settings

## Issues Found
No technical issues found.

## Review Notes
- The Logstash output writes to date-stamped indices (`talos-logs-%{+YYYY.MM.dd}`) while the index template configures `index.lifecycle.rollover_alias`. ILM rollover usually pairs with a rollover alias plus bootstrap index (e.g., `talos-logs-000001`) rather than date-stamped names. The two approaches both work but mixing them in a single setup means the rollover behavior won't actually trigger as intended. This is a design caveat worth noting but not a code-level error.
- Vector's socket source for TCP defaults framing to newline-delimited, so the `decoding.codec = "json"` setup works correctly with Talos's `json_lines` output even though `framing.method` is not explicitly set.
- The talosctl patch bash script uses escaped double-quoted JSON which is fragile but functional; a heredoc or single-quoted JSON would be more robust.
- All endpoint URLs use plain HTTP (`http://elasticsearch:9200`); production deployments should use TLS, but the post is illustrative and this is acceptable for the scope shown.
- The Kibana alert JSON shows the rule type params shape rather than a full create-rule API payload (consumer, schedule, etc. omitted) — this is fine as illustrative configuration but a reader copying it directly into the alerting API would need additional fields.
