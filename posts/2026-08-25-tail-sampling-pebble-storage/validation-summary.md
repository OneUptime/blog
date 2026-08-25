# Validation Summary: Move Tail-Sampling State to the Experimental `tail_storage` Extension

## Status

validated

## Post Type

Technical configuration guide

## Technologies Covered

- OpenTelemetry Collector Contrib v0.159.0
- Tail Sampling processor
- Experimental `TailStorage` interface and feature gates
- `pebble_tail_storage` extension
- CockroachDB Pebble
- OTLP receiver and exporter
- Trace-ID-aware load balancing
- YAML Collector configuration and local-disk operations

## Sources Consulted

- [OpenTelemetry Collector Contrib v0.159.0 release notes](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.159.0)
- [Pebble tail-storage extension documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/extension/tailstorage/pebbletailstorageextension/README.md)
- [Pebble tail-storage configuration and validation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/extension/tailstorage/pebbletailstorageextension/config.go)
- [Pebble tail-storage implementation, startup clearing, and size enforcement](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/extension/tailstorage/pebbletailstorageextension/storage.go)
- [Tail Sampling processor documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md)
- [Tail Sampling configuration and shard validation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go)
- [Tail Sampling storage, append-error, and sampling-strategy paths](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go)
- [Tail Sampling ingestion and OTLP-facing return path](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/sharded_processor.go)
- [Load-balancing exporter documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/exporter/loadbalancingexporter/README.md)
- [OpenTelemetry Collector configuration documentation](https://opentelemetry.io/docs/collector/configuration/)
- [OpenTelemetry Collector feature-gate documentation](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/featuregate/README.md)
- [Pebble disk-usage metric implementation](https://github.com/cockroachdb/pebble/blob/dbdc1acb859689dc4237b40ef8fcdbb877526a84/metrics.go#L511-L529)

## Issues Found

- The startup-clearing description could be read as deletion of every file in the configured directory. It now states precisely that the extension drops stored trace data from the Pebble database under that directory.
- The append-error explanation incorrectly implied that all later policy state contains only successfully stored batches. The processor updates cumulative span-count and size metadata before appending. The post now distinguishes those totals from missing span bodies and explains the different consequences for `trace-complete` and `span-ingest`.
- The `span-ingest` explanation said policies see one incoming batch at a time without noting that span-count and size metadata remain cumulative. That distinction is now explicit.
- The phrase "whole-trace view" could imply that `trace-complete` knows a trace has ended. It was changed to "accumulated-trace view at decision time," which matches the timer-based implementation.

## Review Notes

- The exact YAML was validated successfully with the released `otelcol-contrib` v0.159.0 binary and the documented feature gate. The same configuration fails as documented when the gate is omitted; validation also rejects a missing `directory` and `num_shards: 2` with `tail_storage`.
- The reviewed example targets v0.159.0, the first release with `max_storage_size_mib`; earlier builds cannot use the complete snippet. Tail-storage support itself is alpha, disabled by default, and later releases should be revalidated for breaking changes.
- With the default `drop_pending_traces_on_shutdown: false`, a graceful shutdown drains queued work and finalizes pending traces before stopping. `trace-complete` evaluates the accumulated partial data, while `span-ingest` finalizes still-pending traces as not sampled without re-evaluation. Neither strategy resumes pending state after restart; an ungraceful termination can lose that state outright.
- The four external links in the post resolve to the intended official documentation and source files.
