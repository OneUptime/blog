# Validation Summary: How to Monitor NTP Clock Synchronization with the Collector

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry hostmetrics receiver
- OpenTelemetry filelog receiver
- OpenTelemetry Prometheus receiver
- Prometheus node_exporter
- NTP, ntpd, and chrony
- Linux cron and shell scripting
- VMware Tools time synchronization
- Containers and virtual machines

## Sources Consulted
- OpenTelemetry Collector hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector system scraper generated metric documentation: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/hostmetricsreceiver/internal/scraper/systemscraper/documentation.md
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry stanza json_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry stanza move operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/move.md
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- Prometheus node_exporter README and time sync documentation: https://github.com/prometheus/node_exporter and https://github.com/prometheus/node_exporter/blob/master/docs/TIME.md
- chrony chronyc command documentation: https://chrony-project.org/doc/3.1/chronyc.html
- RFC 5905, Network Time Protocol Version 4: https://datatracker.ietf.org/doc/html/rfc5905.html
- CockroachDB start command documentation for default max clock offset: https://www.cockroachlabs.com/docs/stable/cockroach-start.html
- Google Cloud Spanner TrueTime documentation: https://docs.cloud.google.com/spanner/docs/true-time-external-consistency
- Broadcom VMware time synchronization guidance: https://knowledge.broadcom.com/external/article/326306/disabling-time-synchronization-for-virtu.html

## Issues Found
- The post incorrectly stated that the OpenTelemetry hostmetrics receiver can report NTP clock offset. The hostmetrics `system` scraper reports system uptime, not NTP offset or synchronization status, so the section was corrected to present hostmetrics as supplemental context only.
- The script wrote a multi-line JSON file by overwriting the same path, while the filelog receiver tails log lines and tracks offsets. The example was changed to append newline-delimited JSON to a `.jsonl` file and the filelog configuration was updated to tail that file.
- The chrony parsing treated the `System time` value as signed even though chronyc reports values with `slow` or `fast` wording. The script now applies a negative sign when the local clock is slow and preserves a positive value when it is fast.
- The chrony frequency parsing similarly ignored the `slow` or `fast` direction. The script now emits a signed frequency error.
- The node_exporter section implied that `node_ntp_*` metrics are generally available. The post now notes that the `ntp` collector is deprecated and disabled by default, while the Linux `timex` collector is enabled by default.
- The VM section presented disabling hypervisor time sync as a blanket best practice. It was updated to distinguish periodic time synchronization from one-off VM lifecycle synchronization, matching VMware guidance.

## Review Notes
The alerting-rule YAML remains conceptual because the post does not specify a concrete alert-rule engine. The `node_ntp_stratum` alert depends on node_exporter's deprecated `ntp` collector being explicitly enabled.
