# Validation Summary: How to Configure the Zookeeper Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector Zookeeper receiver
- Apache ZooKeeper four-letter word commands
- OTLP HTTP exporter
- OneUptime telemetry ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib Zookeeper receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/zookeeperreceiver/README.md
- OpenTelemetry Collector Contrib Zookeeper scraper README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/scraper/zookeeperscraper/README.md
- OpenTelemetry Collector Contrib Zookeeper scraper metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/scraper/zookeeperscraper/metadata.yaml
- OpenTelemetry Collector Contrib Zookeeper receiver factory/config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/zookeeperreceiver/factory.go
- Apache ZooKeeper Administrator's Guide, four-letter word commands and whitelist: https://zookeeper.apache.org/doc/current/zookeeperAdmin.html#sc_4lw
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The post said the receiver uses `mntr`, `stat`, and `srvr`. The official receiver uses `mntr` and `ruok`, so I corrected the explanation, whitelist examples, and command tests.
- Several metric names were not emitted by the receiver: `zookeeper.packet.sent`, `zookeeper.packet.received`, `zookeeper.packets.sent.rate`, `zookeeper.packets.received.rate`, `zookeeper.outstanding_requests`, and `zookeeper.server.state`. I replaced them with supported metrics such as `zookeeper.packet.count`, `zookeeper.request.active`, `zookeeper.ruok`, and `zookeeper.fsync.exceeded_threshold.count`, and represented `server.state` as a resource attribute.
- The metric configuration examples included `description` fields under individual metrics. The generated metric config supports fields such as `enabled`, not arbitrary descriptions, so I removed those fields.
- The production receiver examples used `retry_on_failure` under the Zookeeper receiver. The receiver config exposes scraper controller settings such as `collection_interval`, `initial_delay`, and `timeout`, not receiver-side retry settings, so I removed receiver retry blocks and kept exporter retry configuration.
- The security section showed SASL authentication settings under the receiver. The Zookeeper receiver does not expose SASL auth configuration, so I replaced that with guidance to use network controls, a restricted whitelist, or another supported collection path when SASL is mandatory.
- Alerting and summary text referred to unsupported "outstanding requests" metric naming. I updated those references to active request counts.

## Review Notes
- The Zookeeper receiver is currently marked alpha for metrics in OpenTelemetry Collector Contrib.
- The receiver does not support ZooKeeper's newer AdminServer metrics system; it collects from four-letter word commands.
- ZooKeeper documentation notes that four-letter word commands must be explicitly whitelisted in newer versions and are expected to be deprecated in favor of AdminServer.
