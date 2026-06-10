# Validation Summary: How to Build Tempo Distributor Configuration

## Status
validated

## Post Type
Guide / Tutorial (production configuration walkthrough)

## Technologies Covered
- Grafana Tempo (distributor component, version 2.3.0)
- OpenTelemetry Protocol (OTLP) gRPC / HTTP receivers
- Jaeger receiver (thrift_http, thrift_compact, thrift_binary, gRPC)
- Zipkin receiver
- Memberlist (gossip-based ring discovery)
- Kubernetes (Deployment, Service manifests)
- Prometheus (alerting rules, metrics)
- S3 (storage backend)

## Sources Consulted
- [Grafana Tempo Configuration documentation](https://grafana.com/docs/tempo/latest/configuration/)
- [Grafana Tempo Configuration Manifest](https://grafana.com/docs/tempo/latest/configuration/manifest/)
- [OpenTelemetry Collector OTLP receiver README](https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md)
- [OpenTelemetry Collector configgrpc README](https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md)
- [Grafana Tempo Multi-tenancy operations docs](https://grafana.com/docs/tempo/latest/operations/manage-advanced-systems/multitenancy/)

## Issues Found

1. **Incorrect unit annotation for `max_recv_msg_size_mib`.** The original comment described the parameter as "Maximum message size in bytes (default: 4MB)". This parameter is in MiB (mebibytes), not bytes, per the OpenTelemetry Collector configgrpc documentation. Updated the comment to "Maximum message size in MiB (default: 4 MiB)".

2. **Misleading comment on `rate_limit_bytes`.** The comment said "Maximum spans per second across all distributors for this tenant" but the metric is bytes per second, not spans per second. Corrected to "Maximum ingested bytes per second…".

3. **Incorrect nesting of `max_traces_per_user` in `overrides.defaults`.** The Tempo manifest places `max_traces_per_user` under the `ingestion` block, not directly under `defaults`. Moved it under `ingestion` in both the global-defaults example (Section 4) and the full configuration example (Section 6).

4. **Incorrect nesting of `max_bytes_per_trace`.** The Tempo manifest places `max_bytes_per_trace` under the `global` block within `defaults`, not directly under `defaults`. Moved it under `global` in both example configurations.

5. **Per-tenant overrides file missed nesting `max_traces_per_user` under `ingestion`.** Same nesting rule applies inside per-tenant blocks. Fixed both tenant entries in the overrides.yaml example.

6. **Invalid `ring_check_period` distributor option.** The Tempo distributor configuration does not include a `ring_check_period` setting; the comment also misdescribed it as a response timeout. Removed the invalid line from the "Replication and Consistency" example and rewrote the surrounding comments to clarify that the quorum is derived from `ingester.lifecycler.ring.replication_factor`.

7. **Removed `max_search_bytes_per_trace`.** This field is not part of the current `overrides.defaults` schema documented in the Tempo manifest. Removed from the full configuration example to avoid prescribing a non-existent key.

8. **Adjusted failure-tolerance comment.** Reworded "traces survive 2 ingester failures" to "traces are stored on 3 ingesters" — the original wording conflated write availability (quorum = 2 means 1 in-flight failure tolerated) with eventual durability, which can confuse readers.

## Review Notes

- The Kubernetes manifest pins `grafana/tempo:2.3.0`. That image exists and the overall configuration (including the nested `overrides.defaults` structure) is valid for 2.3+. Tempo has moved on to 2.7+ since release; readers running newer versions may want to bump the image tag, but the config keys themselves remain compatible.
- The Jaeger ports listed (`14268`, `6831`, `6832`, `14250`) match the Jaeger receiver defaults from the OpenTelemetry Collector contrib component. Note that `thrift_compact` (6831) and `thrift_binary` (6832) are UDP-based; the post doesn't call this out but the config itself is correct.
- Tenant override field omissions in the per-tenant file silently fall back to zero values rather than the `defaults` block. The post does not warn about this — a future revision could add a note based on the upstream documentation.
- The Mermaid hash-ring diagram uses linear, mutually-exclusive token ranges per ingester. Real Tempo rings use 512 tokens per ingester (per `num_tokens`) interleaved around the ring. The diagram is a useful simplification; flagging here in case a future edit wants to refine it.
- The metric names referenced (`tempo_distributor_bytes_received_total`, `tempo_distributor_spans_received_total`, `tempo_discarded_spans_total`, `tempo_distributor_ingester_appends_total`, `tempo_distributor_ingester_append_failures_total`) match the metrics exposed by Tempo's distributor.
