# Validation Summary: How to Configure the OpAMP Supervisor to Manage Collector Lifecycle

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpAMP
- OpenTelemetry OpAMP Supervisor
- YAML configuration
- systemd service units

## Sources Consulted
- OpenTelemetry Collector management documentation: https://opentelemetry.io/docs/collector/management/
- OpenTelemetry Collector Contrib OpAMP Supervisor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/opampsupervisor
- OpenTelemetry Collector Contrib OpAMP Supervisor configuration source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/opampsupervisor/supervisor/config/config.go
- OpenTelemetry Collector Contrib OpAMP Supervisor design/specification: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/cmd/opampsupervisor/specification/README.md
- OpenTelemetry Collector debug exporter source: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/config.go
- OpenTelemetry Collector logging exporter removal announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- systemd service unit documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html

## Issues Found
- The supervisor configuration used `agent.storage_dir`, but the current supervisor schema uses a top-level `storage.directory`. Updated both supervisor YAML snippets.
- The post used `agent.bootstrap_config_file`, which is not a current supervisor configuration key. Replaced it with `agent.config_files` and the documented special config files used to merge local, OpAMP extension, own telemetry, and remote configuration.
- The health check snippet used `health_check` with polling fields for the collector health endpoint. The supervisor uses `healthcheck` for its own HTTP health endpoint and does not use the shown `interval` polling field. Updated the snippet and explanation.
- The capabilities example enabled `accepts_packages`, but package/binary updates are not fully implemented in the current supervisor. Removed that line from the example.
- The bootstrap collector config used the deprecated/removed `logging` exporter and `loglevel`. Replaced it with the current `debug` exporter and `verbosity`.
- The systemd shutdown explanation said SIGTERM caused the supervisor's graceful shutdown path. The non-Windows supervisor currently handles SIGINT, and the commander sends a graceful shutdown signal to the collector before forcing termination after a timeout. Added `KillSignal=SIGINT` to the unit and updated the shutdown text.
- The post said graceful shutdown ensures no telemetry loss. Changed this to "helps reduce telemetry loss" because shutdown flushing reduces loss risk but cannot guarantee zero loss in all conditions.

## Review Notes
The OpAMP Supervisor is still documented as alpha and its design may change. Future reviews should re-check the supervisor schema and capability implementation status before publishing or updating examples.
