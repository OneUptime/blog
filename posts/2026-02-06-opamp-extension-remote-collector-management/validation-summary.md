# Validation Summary: How to Configure the OpAMP Extension for Remote Collector Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OpAMP extension
- OpAMP Supervisor
- OpAMP protocol
- Collector YAML configuration
- Kubernetes DaemonSet and ConfigMap deployment
- TLS and mTLS configuration

## Sources Consulted
- OpenTelemetry Collector management documentation: https://opentelemetry.io/docs/collector/management/
- OpenTelemetry OpAMP specification: https://opentelemetry.io/docs/specs/opamp/
- OpAMP extension package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/extension/opampextension
- OpAMP Supervisor package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/cmd/opampsupervisor
- OpenTelemetry Collector TLS configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector logging exporter removal notice: https://github.com/open-telemetry/opentelemetry-collector/issues/11337

## Issues Found
- The original Collector `opamp` examples used `instance_id`, but the extension supports `instance_uid`, which must be a UUIDv7 if set. Updated examples to either omit it or use a valid UUIDv7-style value.
- The original `capabilities` examples used list syntax and unsupported capabilities such as `accepts_remote_config`, `reports_remote_config`, `accepts_packages`, and `reports_package_statuses` in the Collector extension. Updated Collector examples to use the supported boolean map syntax and supported extension capabilities.
- The original examples used the removed `logging` exporter. Replaced it with the current `debug` exporter.
- The original post described remote configuration, backup, rollback, package management, health, retry, buffering, and connection settings as Collector `opamp` extension fields. Those fields are not supported by the extension, so the content now distinguishes Collector extension support from OpAMP Supervisor and protocol-level features.
- The remote configuration section incorrectly implied that the in-process Collector extension applies remote config directly. Updated it to use an OpAMP Supervisor configuration with `accepts_remote_config`.
- The package management section incorrectly showed a `packages` block and `accepts_packages` for the Collector extension. Updated it to explain that package management is protocol-level and not currently advertised by the OpenTelemetry OpAMP Supervisor.
- The metadata examples used unsupported `identity` and `resource_attributes` fields under `extensions.opamp`. Replaced them with `agent_description.non_identifying_attributes` and `include_resource_attributes`.
- The Kubernetes example mounted a config file but did not pass `--config=/etc/otel/config.yaml`, and it used unsupported OpAMP fields. Updated the manifest to use a pinned Collector Contrib image, valid OpAMP fields, the `debug` exporter, and explicit config file argument.

## Review Notes
The OpAMP extension is currently alpha in Collector Contrib. The broader OpAMP protocol supports remote configuration and packages, but the Collector extension and the OpAMP Supervisor expose only specific subsets of those capabilities. Future changes should be checked against the exact Collector Contrib version being documented.
