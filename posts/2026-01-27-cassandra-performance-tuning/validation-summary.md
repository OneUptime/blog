# Validation Summary: How to Tune Cassandra for Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Cassandra
- Cassandra Query Language (CQL)
- Cassandra compaction strategies: STCS, LCS, TWCS
- Cassandra `cassandra.yaml` configuration
- JVM garbage collectors: G1GC and CMS
- DataStax/Apache Cassandra Java Driver 4.x
- Linux disk and network tuning
- `nodetool`

## Sources Consulted
- Apache Cassandra `cassandra.yaml` configuration: https://cassandra.apache.org/doc/latest/cassandra/managing/configuration/cass_yaml_file.html
- Apache Cassandra 4.0 `cassandra.yaml` configuration: https://cassandra.apache.org/doc/4.0/cassandra/configuration/cass_yaml_file.html
- Apache Cassandra 4.1 compaction overview: https://cassandra.apache.org/doc/4.1/cassandra/operating/compaction/index.html
- Apache Cassandra 4.1 Size-Tiered Compaction Strategy: https://cassandra.apache.org/doc/4.1/cassandra/operating/compaction/stcs.html
- Apache Cassandra 4.1 Leveled Compaction Strategy: https://cassandra.apache.org/doc/4.1/cassandra/operating/compaction/lcs.html
- Apache Cassandra 4.1 Time Window Compaction Strategy: https://cassandra.apache.org/doc/4.1/cassandra/operating/compaction/twcs.html
- Apache Cassandra production recommendations: https://cassandra.apache.org/doc/latest/cassandra/getting-started/production.html
- Apache Cassandra `nodetool upgradesstables`: https://cassandra.apache.org/doc/3.11/cassandra/tools/nodetool/upgradesstables.html
- Apache Cassandra Java Driver 4.19 configuration docs: https://apache.github.io/cassandra-java-driver/4.19.0/core/configuration/
- Apache Cassandra Java Driver 4.19 speculative execution docs: https://apache.github.io/cassandra-java-driver/4.19.0/core/speculative_execution/
- DataStax Java Driver 4 batch statement docs: https://docs.datastax.com/en/developer/java-driver/4.0/manual/core/statements/batch/
- Oracle Java 11 G1GC tuning docs: https://docs.oracle.com/en/java/javase/11/gctuning/garbage-first-garbage-collector-tuning.html
- Oracle Java 8 CMS collector docs: https://docs.oracle.com/javase/8/docs/technotes/guides/vm/gctuning/cms.html
- OpenJDK JEP 363, CMS removal: https://openjdk.org/jeps/363

## Issues Found
- The CMS JVM section implied CMS could be used generally on legacy systems. Added a note that CMS is available on Java 8 and was removed in Java 14.
- The STCS section stated that STCS requires 2x disk space during compaction. Reworded this to significant free disk space because temporary space depends on the compaction shape and major compactions are the case that can require close to a full additional copy.
- The Java Driver consistency-level snippet imported `ConsistencyLevel` unnecessarily and used speculative execution as a class reference. Updated it to use the documented config class name string and added the missing `Duration` import.
- The write-path configuration described `concurrent_writes` as controlling memtable flush parallelism and sized it by drive count. Corrected it to write request concurrency and the Cassandra-recommended core-based sizing rule.
- The chunk-cache example set `file_cache_size_in_mb` but did not enable the cache. Added `file_cache_enabled: true`.
- The disk access example recommended `mmap` broadly for SSDs. Changed the example to `mmap_index_only`, matching Cassandra 4.x defaults and avoiding overbroad memory-mapped data-file guidance.
- The Java batch/async repository snippet would not compile as written: it used the wrong consistency-level constant, built the batch in an awkward immutable style, omitted imports, and passed `CompletionStage` values to `CompletableFuture.allOf`. Updated it to use `DefaultConsistencyLevel`, `BatchStatementBuilder.addStatement`, and a `List<CompletableFuture<AsyncResultSet>>`.
- The hardware decision diagram repeated the broad `mmap` recommendation. Updated SSD entries to `mmap_index_only`.
- The disk tuning script used 64 KB read-ahead for NVMe. Changed the example to 4 KB for SSD-backed random I/O based on Cassandra production recommendations.
- The disk tuning script said to disable write-back caching when battery-backed cache is present and suggested unsafe barrier-disabling mount options. Reworded these comments so barrier/write-cache disabling is only considered when the storage stack has the appropriate power-loss protection.

## Review Notes
- Cassandra 5.0 documentation recommends Unified Compaction Strategy for most new workloads. The post is framed around Cassandra 4.x-era tuning, where STCS/LCS/TWCS guidance remains technically valid.
- Several numeric tuning values are workload-dependent starting points, not universal best practices. The post already cautions readers to measure and test in staging.
