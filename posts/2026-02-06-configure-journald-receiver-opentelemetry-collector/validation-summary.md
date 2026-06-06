# Validation Summary: How to Configure the Journald Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Journald Receiver
- systemd-journald and journalctl
- Linux system logs
- OpenTelemetry Collector processors, exporters, and storage extensions
- Kubernetes DaemonSet deployment

## Sources Consulted
- OpenTelemetry Collector Contrib Journald Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/journaldreceiver/README.md
- OpenTelemetry Collector Contrib journald input implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/operator/input/journald/input.go
- OpenTelemetry Collector Contrib journald input configuration implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/operator/input/journald/config_linux.go
- OpenTelemetry Collector Debug Exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector components documentation: https://opentelemetry.io/docs/collector/components/
- journalctl manual page: https://www.man7.org/linux/man-pages/man1/journalctl.1.html
- systemd-journald manual page: https://www.man7.org/linux/man-pages/man8/systemd-journald.service.8.html

## Issues Found
- The post said the receiver uses the journald C API through CGO. Current official documentation and code show that it invokes `journalctl`. Updated the explanation accordingly.
- Several examples used `units: [all]`, which is not a documented "collect all" sentinel. Removed those filters and used `priority: debug` where the example intended to include all priorities.
- The basic example used the deprecated/removed `logging` exporter style. Replaced it with the current `debug` exporter and `verbosity: detailed`.
- The `matches` examples used `FIELD=value` strings. The receiver configuration expects a list of maps, so examples now use keys such as `SYSLOG_IDENTIFIER: myapp` and `_TRANSPORT: audit`.
- The article claimed journal fields are automatically mapped to log attributes. The receiver reads the journald JSON object into the log body; stanza operators are needed to move selected fields to attributes. Updated the example to use `move` operators.
- The article claimed priority is automatically mapped to OpenTelemetry severity. The receiver preserves `PRIORITY`; any severity mapping must be configured separately. Updated the section to describe this accurately.
- Kernel log examples used `units: [kernel]`. Current receiver configuration uses `dmesg: true` for kernel messages, matching `journalctl --dmesg`.
- Cursor persistence was described as automatic across restarts. Current receiver docs require a storage extension for persistent cursor state. Added a `file_storage` example and clarified in-memory behavior without storage.
- The Kubernetes DaemonSet example used the stock collector image without addressing the receiver's `journalctl` requirement. Updated the example to use an image that includes `journalctl`, mount `/run/log/journal`, and include the documented security context capabilities.

## Review Notes
The journald receiver is currently alpha for logs in the OpenTelemetry Collector contrib distribution. The examples are now aligned with current upstream configuration fields, but production users should pin a collector image version instead of using `latest`.
