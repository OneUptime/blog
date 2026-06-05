# Validation Summary: How to Monitor Zookeeper Leader Election Frequency, Session Count,

## Status
validated

## Post Type
Tutorial / Monitoring guide

## Technologies Covered
- Apache ZooKeeper
- OpenTelemetry Collector
- OpenTelemetry Collector Zookeeper receiver
- OpenTelemetry Collector filelog receiver
- ZooKeeper four-letter commands
- Docker official ZooKeeper image environment variables
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector Contrib Zookeeper receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/zookeeperreceiver/README.md
- OpenTelemetry Collector Contrib Zookeeper scraper metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/scraper/zookeeperscraper/metadata.yaml
- OpenTelemetry Collector Contrib Zookeeper scraper generated documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/scraper/zookeeperscraper/documentation.md
- OpenTelemetry Collector Contrib Zookeeper scraper source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/scraper/zookeeperscraper/scraper.go
- OpenTelemetry Collector Contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Stanza filter operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/filter.md
- OpenTelemetry Collector Stanza regex parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector Stanza move operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/move.md
- Apache ZooKeeper Administrator's Guide, four-letter commands and whitelist configuration: https://zookeeper.apache.org/doc/current/zookeeperAdmin.html
- Docker Official Image documentation for ZooKeeper: https://hub.docker.com/_/zookeeper

## Issues Found
- The post said the OpenTelemetry Zookeeper receiver collected from `mntr`, `ruok`, and `srvr`. The receiver documentation emphasizes `mntr`, and current scraper source also runs `ruok`; `srvr` is not required by the receiver. Updated the text and whitelist examples to `mntr,ruok`.
- Several metric names used ZooKeeper `mntr`-style names or older/nonexistent OpenTelemetry names. Replaced `zookeeper.connections` with `zookeeper.connection.active`, `zookeeper.outstanding_requests` with `zookeeper.request.active`, `zookeeper.open_file_descriptor.count` with `zookeeper.file_descriptor.open`, and packet direction metrics with `zookeeper.packet.count`.
- The post described `zookeeper.server_state` as a metric. Current OpenTelemetry documentation exposes server state as the `server.state` resource attribute. Updated the leader state text and sample alert condition.
- The filelog `filter` operator example used an expression that would drop matching leader-election log lines. Updated it to drop entries that do not match `LEADING|FOLLOWING|LOOKING`, preserving the intended lines.
- The quorum alert used `zookeeper_up`, which is not emitted by the OpenTelemetry Zookeeper receiver. Updated it to use the documented `zookeeper.ruok` metric.
- Text describing outstanding requests was aligned with the current receiver metric `zookeeper.request.active`, which is documented as the number of currently executing requests.

## Review Notes
The Zookeeper receiver and emitted metrics are currently marked alpha/development in OpenTelemetry Collector Contrib documentation, so metric names and stability may change in future Collector releases.
