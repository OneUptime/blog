# Validation Summary: How to Use Multi-Tenant Routing in the Collector Using the Routing Connector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib routing connector
- OTLP receiver over gRPC and HTTP
- OpenTelemetry Python OTLP span exporters
- Collector YAML configuration

## Sources Consulted
- OpenTelemetry Collector connectors documentation: https://opentelemetry.io/docs/collector/components/connector/
- OpenTelemetry Collector Contrib routing connector documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/connector/routingconnector
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector HTTP server configuration documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/confighttp
- OpenTelemetry Collector gRPC server configuration documentation: https://pkg.go.dev/go.opentelemetry.io/collector/config/configgrpc
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- gRPC metadata documentation: https://grpc.io/docs/guides/metadata/

## Issues Found
- The routing connector example used `statement` with the `request` context. Current routing connector documentation requires `condition` for `request` context and disallows `statement` there. Updated each routing table entry to use `context: request` and `condition: ...`.
- The routing connector example used `match_once: true`. The `match_once` field was deprecated in v0.116.0 and removed in v0.120.0. Removed it and updated the performance explanation to describe the current default `move` action behavior.
- The routing connector example used an `or` expression for request metadata. Current request-context conditions only support simple `request["key"] == "value"` or `request["key"] != "value"` conditions. Split the tenant-c and tenant-d shared route into separate table entries.
- The prerequisites claimed version 0.92.0 or later was sufficient. That is misleading for the current routing connector syntax because later releases removed `match_once` and changed the documented request-context form. Reworded the prerequisite to require a recent contrib release and note that the examples use current syntax.

## Review Notes
The Python OTLP exporter examples use the documented `headers` parameter for both gRPC and HTTP exporters. The OTLP receiver `include_metadata: true` setting is supported by the Collector HTTP and gRPC server configuration and is needed for request metadata routing.
