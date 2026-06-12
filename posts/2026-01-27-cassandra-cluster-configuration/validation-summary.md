# Validation Summary: How to Configure a Cassandra Cluster

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Cassandra
- Cassandra CQL and cqlsh
- cassandra.yaml configuration
- GossipingPropertyFileSnitch and cassandra-rackdc.properties
- Cassandra replication strategies and consistency levels
- nodetool
- Bash
- Python
- Mermaid diagrams

## Sources Consulted
- Apache Cassandra cassandra.yaml configuration: https://cassandra.apache.org/doc/latest/cassandra/managing/configuration/cass_yaml_file.html
- Apache Cassandra architecture, replication, consistency, and gossip documentation: https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html
- Apache Cassandra cqlsh documentation: https://cassandra.apache.org/doc/latest/cassandra/managing/tools/cqlsh.html
- Apache Cassandra nodetool troubleshooting documentation: https://cassandra.apache.org/doc/latest/cassandra/troubleshooting/use_nodetool.html
- Apache Cassandra latest cassandra.yaml source: https://raw.githubusercontent.com/apache/cassandra/trunk/conf/cassandra.yaml
- Apache Cassandra 4.1 nodetool reference: https://cassandra.apache.org/doc/4.1/cassandra/tools/nodetool/nodetool.html
- DataStax OSS Cassandra documentation for historical read/write consistency details: https://docs.datastax.com/en/cassandra-oss/3.0/cassandra/dml/dmlConfigConsistency.html

## Issues Found
- The rack-placement description overstated replica placement guarantees. Updated it to say `NetworkTopologyStrategy` attempts to place replicas on different racks when possible, matching Cassandra's documented rack-aware behavior.
- Several `cassandra.yaml` examples used older Cassandra 4.0-style property names with `_in_ms`, `_in_mb`, or `_mb_per_sec` suffixes. Updated them to current unit-based names such as `commitlog_total_space`, `compaction_throughput`, `read_request_timeout`, `max_hint_window`, and related hint settings.
- The `ssl_storage_port` example described it as the normal encrypted inter-node port even though it is legacy/deprecated in Cassandra 4.0+. Commented it as a legacy setting instead of presenting it as a default production choice.
- The repair command used `-full`; changed it to `--full`, which matches official Cassandra repair examples.
- The replication calculator could raise a `KeyError` when no evaluated RF met the requested availability and `nodes_per_dc` was greater than the evaluated range. Added an explicit evaluated maximum and fallback within the populated recommendation map.
- The replication calculator said to always use odd RF values. Changed this to prefer odd RF values when using quorum-based consistency, because even RF values are valid but can be less convenient operationally.
- The consistency calculator compared global consistency levels against a single-datacenter RF and mapped `ALL` to local RF. Updated it to distinguish total RF from local RF and avoid claiming strong consistency when read and write scopes do not overlap.
- The cqlsh examples used `?` bind markers in statements presented as direct shell examples. Replaced them with concrete literal values so the examples are valid cqlsh input.
- The LWT note said conditional statements automatically use `SERIAL` consistency. Clarified that they use a serial phase and that `SERIAL CONSISTENCY` controls whether that phase uses `SERIAL` or `LOCAL_SERIAL`.
- The health-check script summed the wrong `nodetool tpstats` column for dropped messages. Updated the awk command to read the dropped-message section and sum the `Dropped` column for relevant message types.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. Some operational recommendations, such as per-node data sizing and hardware sizing, remain workload-dependent best practices rather than strict Cassandra requirements.
