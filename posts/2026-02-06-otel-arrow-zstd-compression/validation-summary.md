# Validation Summary: How to Use OTel Arrow with Zstd Compression for Maximum Telemetry Data Reduction

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol with Apache Arrow / OTel Arrow
- Apache Arrow IPC
- gRPC compression
- Zstandard / Zstd
- Prometheus metrics / PromQL

## Sources Consulted
- OpenTelemetry Collector Contrib `otelarrowexporter` README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/otelarrowexporter/README.md
- OpenTelemetry Collector Contrib `otelarrowreceiver` README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/otelarrowreceiver/README.md
- OpenTelemetry Collector Contrib `otelarrowexporter` config/factory source: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/otelarrowexporter
- OpenTelemetry Collector gRPC configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- OpenTelemetry blog, "OpenTelemetry Protocol with Apache Arrow in Production": https://opentelemetry.io/blog/2024/otel-arrow-production/
- Zstandard CLI manual: https://github.com/facebook/zstd/blob/dev/programs/zstd.1.md

## Issues Found
- The original bandwidth and compression-ratio claims were too specific and not aligned with upstream OTel Arrow documentation. Replaced them with documented OTel Arrow production observations and added a variability caveat.
- The exporter configuration implied `compression: zstd` was required and that Arrow was always active. Updated the text to note that current OTel Arrow exporter defaults already use gRPC Zstd, Arrow IPC payload compression is configured separately with `payload_compression`, and the exporter can fall back to OTLP unless configured otherwise.
- The Zstd compression-level section described generic Zstd levels as if they directly mapped to OTel Arrow exporter configuration. Updated it to distinguish CLI Zstd levels from OTel Arrow's `arrow.zstd.level` range of 1-10 and default level 5.
- The dictionary-training section implied a trained dictionary could be referenced in Collector configuration. Removed that implication because OTel Arrow exporter/receiver config does not expose a pre-trained dictionary setting.
- The receiver distribution note was imprecise. Updated it to state that the Collector binary must include the `otelarrow` receiver and that the contrib and Kubernetes distributions include it.
- The metrics examples used non-existent `otelcol_exporter_otelarrow_*` metric names. Replaced them with the documented `otelcol_exporter_sent` and `otelcol_exporter_sent_wire` instruments and corrected the sample `grep` command.
- The comparison section used unsupported fixed CPU-overhead and ratio numbers. Replaced them with documented benchmark-based qualitative guidance.
- The memory section used an unsupported fixed 8 MiB default window calculation. Replaced it with the documented `arrow.zstd.window_size_mib` and receiver `arrow.zstd.memory_limit_mib` behavior.

## Review Notes
The post is now technically valid against current upstream OTel Collector Contrib documentation as of 2026-06-05. The OTel Arrow component defaults are explicitly described as current defaults because upstream documentation notes these compression defaults may change with experience.
