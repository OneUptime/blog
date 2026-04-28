# Validation Summary: How to Configure OpenTelemetry Collector for IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector (contrib distribution)
- OTLP receivers/exporters (gRPC and HTTP)
- Prometheus receiver and exporter
- Syslog receiver (RFC 5424)
- Jaeger receiver
- Transform processor (OTTL)
- Attributes and Resource processors
- Batch processor
- Elasticsearch exporter
- Docker (host networking for IPv6)
- IPv6 bracket-notation addressing

## Sources Consulted
- OpenTelemetry Collector internal-telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- Jaeger exporter migration announcement: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- Jaeger exporter removal tracking: https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/26685
- Loki exporter deprecation: https://github.com/open-telemetry/opentelemetry-collector-contrib/issues/35770
- Loki exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/lokiexporter
- Jaeger receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jaegerreceiver/README.md
- Syslog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/syslogreceiver/README.md
- Transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/

## Issues Found

1. **Jaeger exporter removed from collector-contrib.** The post used a `jaeger:` exporter pointing at `[host]:14250`, but this exporter was deprecated in 2023 and removed from `opentelemetry-collector-contrib` (Jaeger v1.35+ accepts OTLP natively). Replaced with an `otlp/jaeger:` exporter targeting port 4317 and updated the traces pipeline to reference the new name. Added a comment explaining why the standalone jaeger exporter is no longer used.

2. **Loki exporter deprecated.** The post used a `loki:` exporter with `endpoint: .../loki/api/v1/push` and a `labels.resource` block. This exporter is deprecated (Loki v3+ accepts OTLP). Replaced with `otlphttp/loki:` pointing at Loki's OTLP endpoint (`http://[host]:3100/otlp`) and updated the logs pipeline. Removed the `labels.resource` block since it was specific to the deprecated exporter — Loki's OTLP ingest derives labels from resource attributes automatically.

3. **`service.telemetry.metrics.address` deprecated.** The flat `address: "[::]:8888"` form was deprecated in OpenTelemetry Collector v0.111.0. Replaced with the structured `readers:` form using the `pull` exporter and the `prometheus` reader. Note the IPv6 caveat: the `prometheus.host` field expects an unbracketed address, so `host: "::"` is correct (no brackets) — different from the bracketed form used in component endpoint fields.

## Review Notes
- The receiver-side IPv6 binding (`[::]:port`) is correct and current for OTLP, Prometheus scrape targets (in URL form), Syslog, and Jaeger receivers.
- The Jaeger receiver is still supported; only the exporter side was removed. The post's Jaeger receiver block remains valid.
- The OTTL syntax in the transform processor (`set(attributes["x"], "y") where IsMatch(...)`) is valid, including the `context: log` and `context: span` forms used. Newer Collector versions also support context-less statements where the context is inferred from the path, but the explicit form used in the post still works.
- The `net.peer.ip` attribute referenced in the trace_statements OTTL is the legacy semantic-convention name; the current convention is `network.peer.address`. Left as-is since both are still emitted by many SDKs in transition, but readers using only newer SDKs may need to update the attribute key.
- The Docker command uses `--network host`, which delegates IPv6 capability to the host network stack — correct for an IPv6-on-host scenario. For non-host networking, Docker also requires `--ipv6` on the daemon and an IPv6-enabled bridge network (out of scope for this post).
- The `tls.insecure: true` setting is appropriate for the example endpoints but should be replaced with proper TLS in production; the post does not call this out explicitly.
