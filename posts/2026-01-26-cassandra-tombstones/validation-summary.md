# Validation Summary: How to Handle Tombstones in Cassandra

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Apache Cassandra
- Cassandra Query Language (CQL)
- Cassandra nodetool and SSTable tools
- Cassandra compaction strategies, including TWCS
- Python Cassandra driver
- Prometheus alerting

## Sources Consulted
- Apache Cassandra documentation: Tombstones - https://cassandra.apache.org/doc/latest/cassandra/managing/operating/compaction/tombstones.html
- Apache Cassandra documentation: Time Window Compaction Strategy - https://cassandra.apache.org/doc/latest/cassandra/managing/operating/compaction/twcs.html
- Apache Cassandra documentation: cassandra.yaml configuration - https://cassandra.apache.org/doc/4.1/cassandra/configuration/cass_yaml_file.html
- Apache Cassandra documentation: nodetool tablestats - https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/tablestats.html
- Apache Cassandra documentation: nodetool compact - https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/compact.html
- Apache Cassandra documentation: nodetool garbagecollect - https://cassandra.apache.org/doc/latest/cassandra/managing/tools/nodetool/garbagecollect.html
- Apache Cassandra documentation: sstablemetadata - https://cassandra.apache.org/doc/latest/cassandra/managing/tools/sstable/sstablemetadata.html
- Apache Cassandra documentation: Monitoring metrics - https://cassandra.apache.org/doc/4.1/cassandra/operating/metrics.html
- DataStax Python driver documentation: query API and UNSET_VALUE - https://docs.datastax.com/en/developer/python-driver/3.12/api/cassandra/query/
- DataStax CQL documentation: DELETE - https://docs.datastax.com/en/cql-oss/3.3/cql/cql_reference/cqlDelete.html
- DataStax CQL documentation: TRACING - https://docs.datastax.com/en/cql-oss/3.3/cql/cql_reference/cqlshTracing.html

## Issues Found
- The row tombstone example used `DELETE FROM users WHERE user_id = ...`, which is a partition-level delete when `user_id` is the full partition key. Changed the example to a table with a clustering key and a full primary-key delete, which correctly demonstrates a row tombstone.
- The lifecycle diagram implied Cassandra checks whether all replicas are synchronized during local compaction. Changed this to the local compaction requirement that older shadowed data must be included before a tombstone can be removed.
- The `gc_grace_seconds` explanation said the grace period ensures all replicas have received the delete. Changed this to say it gives unavailable replicas time to receive the delete, which is more accurate.
- The nodetool section described `tablestats` as SSTable metadata and used the old `cfstats` name. Updated this to use `nodetool tablestats` consistently and describe it as table statistics.
- Added a note that `sstablemetadata` should be run on a stopped node or copied SSTables offline.
- TWCS comments said no tombstones are needed or created when data expires. TTL expiry still becomes tombstoned data, but TWCS can drop fully expired SSTables efficiently. Updated the text and diagram labels.
- The `nodetool compact -s` command was described as forcing compaction with specific SSTables. In current Cassandra docs, `-s` means split output. Added a correct `--user-defined` example for specific SSTable files.
- The table-wide `DELETE FROM temp_processing_table;` example is not valid CQL and would not be the right way to remove all rows. Replaced it with per-row deletes as the bad example and kept `TRUNCATE` as the preferred table-wide operation.
- The soft-delete Python example passed `None` for `deleted_at`, which would create a tombstone. Changed it to use the Python driver's `UNSET_VALUE`, and added missing `timedelta` and `time` imports.
- The soft-delete lookup used `ALLOW FILTERING` unnecessarily. Changed it to read by primary key and filter `is_active` in application code.
- The queue Python example used `json.loads()` without importing `json` and imported `BatchStatement` without using it. Added `json` and removed the unused import.
- The Prometheus alert for tombstone scans referenced a metric that the sample exporter did not emit. Updated the alert to use the exporter-defined `cassandra_table_tombstones_scanned_per_read` gauge and added parsing logic for `Average tombstones per slice`.
- The tombstone read-failure alert referenced a non-standard client request metric. Changed it to an explicitly log-exporter-dependent `cassandra_tombstone_overwhelming_exceptions_total` counter.

## Review Notes
The post is technically relevant and useful. Some examples remain intentionally simplified for a blog format, especially the sampling script and Prometheus metric naming, but the corrected snippets no longer present invalid Cassandra commands or misleading tombstone behavior.
