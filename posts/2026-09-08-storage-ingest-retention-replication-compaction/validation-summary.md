# Validation Summary: How to Forecast Storage from Ingest, Retention, and Replication

## Status
validated

## Post Type
Technical capacity-planning guide with mathematical sizing formulas and operational implementation details. Eligible for technical validation despite having no executable code.

## Technologies Covered
- Storage capacity forecasting, compression, retention tiers, replication, and erasure coding
- Prometheus local TSDB, WAL, head chunks, compaction, and retention
- Apache Cassandra SSTables, compression metrics, tombstones, and compaction
- Elasticsearch disk watermarks and shard placement
- Cloud block storage capacity and performance constraints

## Sources Consulted
- Prometheus storage: https://prometheus.io/docs/prometheus/latest/storage/
- Cassandra compaction overview: https://cassandra.apache.org/doc/stable/cassandra/managing/operating/compaction/overview.html
- Cassandra compression: https://cassandra.apache.org/doc/stable/cassandra/managing/operating/compression.html
- Cassandra storage and compaction metrics: https://cassandra.apache.org/doc/stable/cassandra/managing/operating/metrics.html
- Cassandra replication and placement architecture: https://cassandra.apache.org/doc/stable/cassandra/architecture/dynamo.html
- Elasticsearch shard allocation and disk watermarks: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings
- Ceph erasure coding: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Amazon EBS volume types and performance limits: https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html

## Issues Found
1. The Cassandra compression-ratio discussion could imply equivalence with the post's ingest-to-storage ratio. Clarified that Cassandra uses uncompressed SSTable data as its denominator, not accepted raw payload bytes.
2. The changing-retention summation left its time domain implicit. Restricted the sum explicitly to data retained at the forecast date and its applicable tier size, preventing expired data from being included.
3. Adding all steady overhead after measuring primary stored bytes could double-count indexes or metadata and leave replica overhead underspecified. Clarified that only excluded components should be added and their physical footprint must cover all copies in the planned pool.
4. The Prometheus buffer explanation grouped WAL and head chunks with the compaction allowance without explaining size accounting. Clarified that WAL and mapped head chunks count toward the size limit, while retention deletes persistent blocks; the documented buffer accommodates compaction overlap.
5. The safe-fill equation labeled its result raw device capacity, although a fill threshold applies to the disk capacity visible to the engine. Renamed the terms to allocated disk capacity and required physical bytes, and clarified that lower-layer overhead requires a separate conversion to raw capacity.

## Review Notes
- Arithmetic verified: daily ingest is 1.296 decimal TB; retained primary data is 16.3296 TB, rounded to 16.33 TB; three copies require 48.9888 TB, rounded to 48.99 TB; 55 / 0.80 is 68.75 TB.
- Formula blocks are explanatory mathematics, not executable programs. No CLI commands, configuration snippets, or API calls require runtime testing.
- Official documentation supports compaction overlap, delayed reclamation, replication accounting, erasure-coding overhead, node-level watermarks, placement awareness, and independent capacity/performance limits.
- Cassandra tombstone reclamation remains subject to grace-period and compaction eligibility rules; compaction does not necessarily remove every tombstone.
- All five technical documentation links resolve to relevant official resources. The Elasticsearch legacy URL redirects to the current documentation and remains usable. The GitHub author link is an attribution link, not technical evidence.
- Product documentation uses moving latest/stable aliases. The post makes no fixed-version API claims. Its 80 percent safe-fill example is a tested-policy assumption, not a universal platform default.
- Production compression, skew, compaction workspace, deletion lag, and recovery throughput cannot be established from documentation alone; the post correctly calls for workload-specific measurements.
