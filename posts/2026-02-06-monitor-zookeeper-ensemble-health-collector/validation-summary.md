# Validation Summary: How to Monitor Zookeeper Ensemble Health with the Collector

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache ZooKeeper
- ZooKeeper four-letter-word administrative commands
- OpenTelemetry Collector
- OpenTelemetry Collector Zookeeper receiver
- OpenTelemetry Collector resource and batch processors
- OTLP exporter
- Ensemble quorum monitoring and alerting

## Sources Consulted
- Apache ZooKeeper Administrator's Guide, Four Letter Words and `4lw.commands.whitelist`: https://zookeeper.apache.org/doc/current/zookeeperAdmin.html
- Apache ZooKeeper Programmer's Guide, ZooKeeper overview and watches: https://zookeeper.apache.org/doc/current/zookeeperProgrammers.html
- OpenTelemetry Collector Contrib Zookeeper receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/zookeeperreceiver/README.md
- OpenTelemetry Collector Contrib Zookeeper scraper generated metric documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/scraper/zookeeperscraper/documentation.md
- OpenTelemetry Collector Contrib Zookeeper scraper implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/scraper/zookeeperscraper/scraper.go
- OpenTelemetry Collector Contrib Zookeeper metric mapping implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/scraper/zookeeperscraper/metrics.go
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- Changed the ensemble architecture wording from requiring an odd number of nodes to saying ZooKeeper ensembles are usually deployed with an odd number of voting nodes. ZooKeeper can be configured with other layouts, including observers, but odd voting membership is the common quorum-efficient deployment.
- Corrected the ZooKeeper four-letter-word default behavior from "3.5+" to "3.5.3+" and clarified that most commands are disabled by default. The Apache documentation says the whitelist behavior was added in 3.5.3 and defaults to `srvr`, plus `isro` when read-only mode is enabled.
- Clarified that the current OpenTelemetry Collector Zookeeper scraper runs both `mntr` and `ruok`, so both commands must be whitelisted for the shown receiver to collect successfully.
- Replaced the non-existent `zookeeper.server_state` metric with the current `server.state` resource attribute emitted by the Zookeeper scraper.
- Replaced the non-existent `zookeeper.followers` and `zookeeper.synced_followers` metric names with `zookeeper.follower.count` using the `state="synced"` and `state="unsynced"` attributes.
- Corrected the quorum alert thresholds. `zk_synced_followers` and the Collector's synced follower metric count only followers, not the leader, so a five-node ensemble needs two synced followers plus the leader for quorum, not three synced followers.
- Replaced the non-existent `zookeeper.outstanding_requests` metric with the current `zookeeper.request.active` metric, which is derived from ZooKeeper's `zk_outstanding_requests` field.
- Updated dashboard wording to reference `zookeeper.packet.count` for received/sent packet throughput and `zookeeper.data_tree.size` for data size.
- Updated leader election detection wording to track changes in the `server.state` resource attribute instead of a `server_state` metric.

## Review Notes
- The collector configuration shape is valid for the contrib Zookeeper receiver: multiple named receiver instances can share one metrics pipeline, and `endpoint`, `collection_interval`, `timeout`, resource processor attributes, batch processor settings, and OTLP exporter headers match current Collector configuration patterns.
- The Zookeeper receiver is part of the OpenTelemetry Collector contrib distribution and is marked alpha for metrics in current documentation.
- The alert examples remain pseudocode. A production alert should also include a separate leader-present alert because follower count metrics are only exposed by the leader.
