# Validation Summary: How to Configure the Netflow Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Netflow Receiver
- NetFlow v5 and v9
- IPFIX
- sFlow
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry Collector transform, filter, groupbyattrs, resource, batch, debug, OTLP, and health_check components

## Sources Consulted
- OpenTelemetry Collector Contrib Netflow Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/netflowreceiver
- OpenTelemetry Collector Contrib Netflow Receiver config source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/netflowreceiver/config.go
- OpenTelemetry Collector Contrib Netflow Receiver parser source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/netflowreceiver/parser.go
- OpenTelemetry Collector Contrib Netflow Receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/netflowreceiver/metadata.yaml
- OpenTelemetry Collector transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry Collector groupbyattrs processor metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbyattrsprocessor/metadata.yaml
- OpenTelemetry Collector Prometheus exporter metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusexporter/metadata.yaml
- OpenTelemetry Collector receivers registry: https://opentelemetry.io/docs/collector/components/receiver/

## Issues Found
- The post used invalid Netflow Receiver configuration keys: `endpoint`, `protocol`, and `template_cache_ttl`. The upstream receiver uses `scheme`, `hostname`, `port`, `sockets`, `workers`, `queue_size`, and `send_raw`. I updated the examples to use `scheme: netflow` or `scheme: sflow` with `hostname` and `port`.
- The post described the receiver as converting flow data into logs and metrics. The upstream receiver is alpha for logs only, so I changed those claims and removed the Prometheus exporter from logs pipelines.
- Several examples treated Netflow v5, Netflow v9, and IPFIX as separate `protocol` values. The receiver uses `scheme: netflow` for Netflow v5, Netflow v9, and IPFIX, and `scheme: sflow` for sFlow. I updated the protocol examples and multi-protocol configuration accordingly.
- The flow processing examples read non-existent log body fields such as `body["src_addr"]`, `body["in_bytes"]`, and `body["protocol"]`. The receiver emits parsed values as log attributes such as `source.address`, `destination.address`, `network.transport`, `flow.io.bytes`, `flow.io.packets`, and `flow.sampler_address`. I updated the transform snippets to use those attributes.
- The sFlow section claimed counter sample support for interface statistics. The upstream receiver supports `flow_sample` and `flow_sample_expanded`; `counter_sample` and `counter_sample_expanded` are not yet supported. I corrected that bullet.
- The security filter examples used the older `logs.log_record` shape and did not account for the filter processor dropping records when conditions match. I updated them to use `log_conditions` and inverted the conditions where the intended behavior was to keep only suspicious records.
- The port scan example referenced `tcp.flags.syn` and `tcp.flags.ack`, which are not emitted by the receiver. I changed it to use the emitted `flow.tcp_flags` integer field.
- The protocol classification examples compared numeric protocol values, but the receiver emits `network.transport` as a protocol name string. I updated those examples to compare strings such as `tcp`, `udp`, and `icmp`.

## Review Notes
The receiver is still alpha for logs, so production users should validate behavior against their Collector Contrib version before relying on these examples in critical monitoring pipelines. The traffic-analysis examples add fields to logs for backend aggregation; they do not create native OpenTelemetry metric streams inside the Collector.
