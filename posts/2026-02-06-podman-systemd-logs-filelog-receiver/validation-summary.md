# Validation Summary: How to Configure Podman systemd Container Services to Export Structured Logs to

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- systemd user services
- systemd journal / journald
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector journald receiver
- OpenTelemetry Collector filelog receiver
- Stanza log operators
- Python logging

## Sources Consulted
- Podman `podman generate systemd` documentation: https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- Podman `podman create` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- OpenTelemetry Collector receiver registry: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector Contrib journald receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/journaldreceiver/README.md
- OpenTelemetry Collector Contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Stanza `json_parser` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Stanza `move` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/move.md
- OpenTelemetry Stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Stanza severity parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- OpenTelemetry Collector Contrib Dockerfile: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol-contrib/Dockerfile

## Issues Found
- `podman generate systemd` is now documented as deprecated for new feature work, with Quadlet recommended for new systemd-managed containers. Added that caveat while keeping the tutorial's generated-unit workflow intact because the command remains supported.
- The description of `--new` incorrectly said it pulls the latest configuration. Updated it to state that generated units create containers at service start and remove them at service stop based on the existing container configuration.
- The file logging example used `--log-driver=json-file` without explaining that current Podman treats it as an alias. Changed the example to `--log-driver=k8s-file` and noted that `json-file` remains an alias.
- The journald receiver example filtered units without the `.service` suffix and described `priority` as parsing. Updated the unit names to full service names and clarified that `priority` filters journal entries.
- The filelog receiver parsed `attributes["log.file.path"]` but did not enable `include_file_path`, whose default is `false`. Added `include_file_path: true`.
- The Podman JSON log timestamp layout used millisecond parsing. Updated it to use nanosecond parsing for Podman `k8s-file`/`json-file` timestamps.
- The Python example used `datetime.utcnow()`, which is deprecated in current Python. Replaced it with `datetime.now(timezone.utc)` and adjusted the parser layout for microsecond timestamps.
- The ordering dependency explanation overpromised that logs are collected from the exact start of applications. Reworded it to say this helps the Collector be ready first.

## Review Notes
- The journald receiver requires the `journalctl` binary and sufficient journal permissions, which are important deployment considerations for containerized Collectors.
- The OpenTelemetry Collector image and mounted config path used in the post match the official Contrib distribution defaults.
