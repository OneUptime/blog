# Validation Summary: How to Fix Loki 'Entry Out of Order' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Grafana Loki
- Promtail
- Fluent Bit
- Prometheus metrics and alerting
- Docker logs
- Linux time synchronization with chrony/ntpd
- Kubernetes pod log collection

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki request validation and rate limits: https://grafana.com/docs/loki/latest/operations/request-validation-rate-limits/
- Grafana Loki ingestion troubleshooting: https://grafana.com/docs/loki/latest/operations/troubleshooting/troubleshoot-ingest/
- Grafana Loki label cardinality guidance: https://grafana.com/docs/loki/latest/get-started/labels/cardinality/
- Grafana Loki label best practices: https://grafana.com/docs/loki/latest/get-started/labels/bp-labels/
- Promtail timestamp stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/timestamp/
- Promtail configuration reference: https://grafana.com/docs/loki/latest/send-data/promtail/configuration/
- Promtail labels stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/labels/
- Fluent Bit Loki output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/loki

## Issues Found
- The post incorrectly presented `out_of_order_time_window` as a Loki setting. That option is not part of Loki's current configuration reference. I replaced it with Loki's documented `max_chunk_age` behavior, where the accepted out-of-order window is half of `max_chunk_age`.
- The post implied unordered writes must generally be enabled manually. Current Loki documentation states unordered writes are enabled by default as of Loki 2.4, and the current configuration reference marks `unordered_writes` as deprecated. I updated the explanation to reflect the default behavior and removed it from new example configuration.
- The initial explanation said Loki requires strict timestamp ordering within a stream. I updated it to explain current Loki behavior: out-of-order writes are accepted within the configured window, but entries too far behind are rejected.
- The error examples included `stream rate limit exceeded`, which is a rate-limit problem rather than an out-of-order timestamp problem. I replaced it with documented out-of-order and timestamp-too-old messages.
- The monitoring examples used the non-current reason label `timestamp_too_old`. I replaced it with documented Loki reasons: `too_far_behind`, `out_of_order`, and `greater_than_max_sample_age`.
- The Promtail timestamp failure description listed an unsupported `keep` action and said the default was current time. Promtail supports `fudge` and `skip`, with `fudge` as the default. I corrected the comments.
- The Promtail pipeline snippet mixed regex and JSON timestamp extraction in one pipeline while describing JSON as an alternative. I split the JSON example into its own scrape configuration.
- The dynamic labels example promoted `request_id` to a Loki label, which conflicts with Loki's guidance to avoid unbounded high-cardinality labels. I removed `request_id` from the label example and added a note to use structured metadata for high-cardinality fields.
- The Fluent Bit example included unsupported Loki output settings `batch_wait` and `batch_size`, and described `line_format` as enabling ordering. I removed those invalid settings and corrected the comments while keeping documented options.
- The Kubernetes time sync section suggested mounting `/etc/localtime` as a time synchronization method. Containers share the host kernel clock, and that mount only affects timezone data. I replaced it with guidance to synchronize Kubernetes node clocks.
- The file rotation example said `action_on_failure: skip` skips logs older than one hour. That setting only controls timestamp parse/extraction failures, so I corrected the comment.

## Review Notes
Promtail is now deprecated and in Long-Term Support through February 28, 2026, with End-of-Life on March 2, 2026. The post remains technically useful for Promtail users, but a future update should consider Grafana Alloy examples.
