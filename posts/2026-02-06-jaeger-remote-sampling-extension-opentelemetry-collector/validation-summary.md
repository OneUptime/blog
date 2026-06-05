# Validation Summary: How to Configure Jaeger Remote Sampling Extension in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Jaeger Remote Sampling extension
- Jaeger sampling strategy files
- Tail sampling processor
- Collector internal telemetry
- YAML, JSON, and Bash

## Sources Consulted
- OpenTelemetry Collector Contrib Jaeger Remote Sampling extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/jaegerremotesampling
- OpenTelemetry Collector Contrib Jaeger Remote Sampling extension package docs and config types: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/jaegerremotesampling
- Jaeger sampling documentation: https://www.jaegertracing.io/docs/1.76/architecture/sampling/
- OpenTelemetry Collector Contrib tail sampling processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The Collector extension type was written as `jaeger_remote_sampling`, but the official component type is `jaegerremotesampling`. Updated all Collector snippets and service extension references.
- The post described remote sampling as returning per-trace sampling decisions. The Jaeger remote sampling API serves sampling strategies; compatible SDK samplers make decisions locally. Updated explanations and the sequence diagram.
- The remote source example used an HTTP endpoint plus unsupported `refresh_interval`, `timeout`, and list-style `headers` fields under `source.remote`. The extension's `remote` source is a gRPC client to a Jaeger remote sampling service. Replaced the example with `endpoint: "jaeger-collector:14250"` and `reload_interval`; noted that HTTP/S strategy JSON belongs in the `file` source.
- The gRPC TLS example included unsupported `client_auth_type`. Current Collector server TLS configuration uses `client_ca_file` to configure client certificate verification, so the extra field was removed.
- The sampling strategy section used `const` strategies in the JSON file. Jaeger strategy files document `probabilistic` and `ratelimiting`, with operation strategies using probabilistic sampling. Replaced `const` examples with probabilistic `0.0` and `1.0` values.
- The tail sampling section claimed tail sampling could capture errors and slow traces regardless of the initial head-sampling decision. Tail sampling only sees traces that reach the Collector. Updated the explanation to clarify that head-sampled-out traces cannot be recovered.
- The monitoring snippet used invalid extension-level `telemetry` configuration and obsolete `service.telemetry.metrics.address` syntax. Updated it to the current Collector internal telemetry `readers` syntax for a Prometheus pull exporter.
- The named sampling metrics (`sampling_requests_total`, `sampling_decisions_sampled`, `sampling_decisions_not_sampled`) were not documented Collector/extension metrics. Replaced them with documented Collector span flow metrics and HTTP/gRPC server request metrics.

## Review Notes
- The Jaeger Remote Sampling extension is currently an alpha OpenTelemetry Collector Contrib extension, so configuration and telemetry details may change across Collector releases.
- The gRPC endpoint default port `14250` can conflict with Jaeger receiver usage; deployments using both should choose non-conflicting ports.
