# Validation Summary: How to Use Cassandra Secondary Indexes

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Cassandra
- Cassandra Query Language (CQL)
- Secondary indexes (2i)
- SASI indexes
- Storage-Attached Indexes (SAI)
- Cassandra monitoring with virtual tables, JMX metrics, nodetool, and Prometheus

## Sources Consulted
- Apache Cassandra documentation: Indexing concepts - https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/indexing-concepts.html
- Apache Cassandra documentation: When to use a secondary index - https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/2i/2i-when-to-use.html
- Apache Cassandra documentation: Working with secondary indexing (2i) - https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/2i/2i-working-with.html
- Apache Cassandra documentation: CREATE INDEX - https://cassandra.apache.org/doc/latest/cassandra/reference/cql-commands/create-index.html
- Apache Cassandra documentation: CREATE CUSTOM INDEX / SAI - https://cassandra.apache.org/doc/latest/cassandra/developing/cql/create-custom-index.html
- Apache Cassandra documentation: SAI concepts and FAQ - https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/sai/sai-concepts.html and https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/sai/sai-faq.html
- Apache Cassandra documentation: SAI monitoring and virtual tables - https://cassandra.apache.org/doc/latest/cassandra/developing/cql/indexing/sai/operations/monitoring.html and https://cassandra.apache.org/doc/latest/cassandra/reference/sai-virtual-table-indexes.html
- Apache Cassandra 3.11 documentation: SASI - https://cassandra.apache.org/doc/3.11/cassandra/cql/SASI.html
- Apache Cassandra 4.1 cassandra.yaml documentation - https://cassandra.apache.org/doc/4.1/cassandra/configuration/cass_yaml_file.html
- Apache Cassandra CEP-7: Storage Attached Index - https://cwiki.apache.org/confluence/display/CASSANDRA/CEP-7%3A+Storage+Attached+Index
- DataStax CQL documentation for SASI options - https://docs.datastax.com/en/cql-oss/3.x/cql/cql_reference/cqlCreateCustomIndex.html

## Issues Found
- The post recommended secondary indexes for generically "low-cardinality" columns, while Cassandra documentation warns that extremely low-cardinality values, such as booleans, are also poor index candidates. Changed the wording to emphasize selective/moderate-cardinality values.
- The post described SAI as available in Apache Cassandra 4.0+. Apache Cassandra SAI was released in Cassandra 5.0. Updated the version guidance and summary table while retaining the DSE/Astra caveat.
- The SAI examples used `USING 'StorageAttachedIndex'` as the general Apache Cassandra syntax. Updated the Apache Cassandra examples to the documented `USING 'sai'` syntax.
- The SAI configuration snippet referenced `sai_indexes_enabled`, which is not a documented Apache Cassandra SAI setting. Removed that guidance.
- The SASI StandardAnalyzer examples omitted `analyzed: true` and used `case_sensitive` where lowercase normalization was the relevant documented analyzer option. Updated the options.
- The SASI memory option `max_memory_mb` was not the documented option name. Replaced it with `max_compaction_flush_memory_in_mb`.
- The write-path diagram showed memtable insertion before commit log append. Updated the diagram to show commit log append before memtable/index updates.
- The index size query used invalid `system.size_estimates` columns. Replaced it with the documented SAI `system_views.indexes` fields.
- The SAI tuning example referenced `sai_max_rows_per_segment`, which is not the documented setting. Replaced it with `segment_write_buffer_space_mb`.
- The production and monitoring sections referenced `system.index_build_status` and `system_views.local_read_latency` for index monitoring. Replaced those snippets with documented `system_views.indexes` queries and `nodetool tablestats`.
- The Further Reading links used outdated or incorrect Cassandra documentation paths. Updated them to current Apache Cassandra documentation URLs.

## Review Notes
The post is technically relevant and salvageable. SASI remains experimental in Cassandra 4.x and should be treated as legacy; SAI is the preferred indexing path for Apache Cassandra 5.0+ but is still a filtering/indexing feature, not a replacement for a dedicated search engine.
