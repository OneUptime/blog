# Validation Summary: How to Build an OpenTelemetry Pipeline with Apache Pulsar for Multi-Region

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Apache Pulsar
- Pulsar geo-replication
- Pulsar Admin CLI
- OpenTelemetry Collector
- OpenTelemetry Collector contrib Pulsar exporter and receiver
- OpenTelemetry Collector filter processor
- Python
- Flask
- Pulsar Python client

## Sources Consulted
- Apache Pulsar geo-replication documentation: https://pulsar.apache.org/docs/4.0.x/administration-geo/
- Apache Pulsar Admin CLI reference: https://pulsar.apache.org/docs/4.0.x/reference-pulsar-admin/
- Apache Pulsar Python client API documentation: https://pulsar.apache.org/api/python/3.6.x/pulsar.Client.html
- OpenTelemetry Collector contrib Pulsar exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/pulsarexporter/README.md
- OpenTelemetry Collector contrib Pulsar exporter config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/pulsarexporter/config.go
- OpenTelemetry Collector contrib Pulsar receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/pulsarreceiver/README.md
- OpenTelemetry Collector contrib Pulsar receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/pulsarreceiver/config.go
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md

## Issues Found
- The post said the OpenTelemetry Collector has no native Pulsar exporter and suggested using the Collector HTTP exporter with a Pulsar HTTP endpoint. The core Collector does not include Pulsar, but the contrib distribution has a Pulsar exporter; Pulsar does not provide an OTLP-compatible HTTP ingest endpoint. Updated the text to recommend either a bridge service or the contrib Pulsar exporter.
- The Pulsar exporter example used `tls_trust_certs_file`, but the contrib component's current config field is `tls_trust_certs_file_path`. Updated the field name.
- The Pulsar exporter token auth example used a scalar `auth.token` value, but the current config uses nested token auth. Updated it to `auth.token.token`.
- The Python bridge used `routing_mode` and `pulsar.PartitionRoutingMode.UseSinglePartition`, but the current Python client uses `message_routing_mode` and `pulsar.PartitionsRoutingMode.UseSinglePartition`. Updated the producer options.
- The Python bridge comment claimed partitioning by trace ID, but the example does not set a message key from the trace ID. Updated the comment to describe the actual single-partition behavior.
- The Python bridge checked `"protobuf" in content_type` without handling a missing content type. Updated it to default `content_type` to an empty string.
- The optional filter processor example used the older `traces.span` configuration shape. Updated it to the current `trace_conditions` format with `error_mode: ignore`.
- The geo-replication explanation implied synchronous low-latency replication and a complete copy of all historical data. Updated the wording to describe asynchronous replication and clarify that newly published data is replicated.

## Review Notes
- The Pulsar exporter and receiver are currently alpha components in the OpenTelemetry Collector contrib distribution, so production use should pin and test a specific collector-contrib release.
- Pulsar geo-replication must be configured on every participating cluster with matching tenant and namespace policies.
- Existing messages from before geo-replication is configured are not automatically replicated.
