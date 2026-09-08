# How to Forecast Storage from Ingest, Retention, and Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Storage, Capacity Planning, Scalability, Reliability, Forecasting

Description: Forecast usable storage from ingest rate, encoded size, retention tiers, replication, and measured temporary space for compaction and recovery.

---

Storage plans often multiply today's ingest by retention and stop. That omits encoded size, replicas, indexes, tombstones, compaction overlap, skew, recovery, and the fact that a full disk may stop accepting writes before it reaches 100 percent.

Model logical retained data first, then convert it into physical and operational capacity.

## Measure bytes per retained unit

Choose a work unit such as event, sample, row, object, or log line. From representative production data measure:

```text
accepted units per second by class
raw bytes per unit
stored bytes after encoding and compression
index and metadata bytes
write-ahead log or journal bytes
update, delete, and tombstone behavior
```

Do not use network payload size as stored size without measurement. Schema, labels, indexes, compression, block padding, and object metadata change the result. Keep incompressible and highly compressible classes separate.

Define a measured storage ratio:

```text
encoded ratio = primary stored bytes / accepted raw bytes
```

For Cassandra, the documented SSTable compression ratio is stored size relative to uncompressed size. Measure it per table because data and algorithms differ.

## Calculate retained primary data

For constant rate:

```text
raw bytes/day = units/second * raw bytes/unit * 86,400
primary retained bytes = raw bytes/day * retention days * encoded ratio
```

For tiered or changing retention, sum time buckets and classes:

```text
primary retained = sum(rate_i,t * seconds_t * stored bytes per unit_i,t)
```

Suppose 20,000 events/second average 750 raw bytes, retain for 30 days, and have a measured primary encoded ratio of 0.42:

```text
raw/day = 20,000 * 750 * 86,400 = 1.296 TB decimal
primary retained = 1.296 * 30 * 0.42 = 16.33 TB decimal
```

State decimal TB versus binary TiB explicitly. Providers and operating systems may display different units.

Forecast the rate and size distribution through the storage procurement horizon. Cardinality growth or a new field can increase bytes per event even when event rate is flat.

## Apply durability overhead correctly

Replication factor usually describes total copies, but product semantics vary. If the system stores three full copies:

```text
replicated steady data = primary retained * 3 = 48.99 TB
```

Do not add two and then multiply by three again. For erasure coding, use the actual data-plus-parity ratio and small-object overhead rather than calling it a replication factor. Include cross-tier or snapshot copies only if they consume the storage pool being planned.

Distribute data by the product's placement unit and failure domain. Cluster totals can be healthy while one node or shard reaches its watermark because of skew. Plan the largest node, partition, tenant, and availability zone as well as the average.

## Separate steady overhead from temporary workspace

Add measured steady components:

- indexes, Bloom filters, manifests, and metadata;
- WAL, commit log, or journal retention;
- tombstones and old versions awaiting reclamation;
- snapshots, if stored on the same capacity;
- filesystem reserve and operational tooling.

Then reserve temporary workspace for compaction, merge, repair, rebuild, rebalancing, restore, and upgrade. Do not apply one arbitrary permanent `compaction factor`. Measure the maximum coexistence of old and new data for the configured engine and strategy.

Prometheus documents that source and output blocks coexist during compaction and recommends setting size retention to at most 80 to 85 percent of its allocated disk so WAL, head chunks, and compaction have space. Apache Cassandra documents that immutable SSTables retain old versions and tombstones until compaction writes merged SSTables and releases the old files.

## Calculate provisioned capacity

Keep components visible:

```text
provisioned usable bytes
  >= replicated steady data
   + steady metadata and log overhead
   + temporary operation workspace
   + growth during provisioning lead time
   + failure and skew reserve
```

Alternatively, if policy uses a maximum safe fill ratio:

```text
raw device capacity >= required usable bytes / safe fill ratio
```

Avoid counting the same reserve in both forms. If 55 TB includes all steady and temporary requirements and the platform's tested maximum safe fill is 80 percent:

```text
raw capacity >= 55 / 0.80 = 68.75 TB
```

Validate provider volume limits, IOPS, throughput, attachment count, and expansion behavior. More bytes do not guarantee enough compaction bandwidth or recovery time.

## Forecast exhaustion and expansion lead time

Track:

```text
net physical growth bytes/day
days to low and high watermarks by node
compaction backlog and bytes pending
oldest retained data and deletion lag
replica or shard imbalance
rebuild bytes and estimated recovery duration
```

Base time-to-full on the conservative growth slope and the earliest constrained node. Trigger expansion before procurement, rebalance, and recovery lead time consumes the remaining days.

Test retention deletion. Some engines remove expired data only when a block is fully expired or after compaction, so logical expiration is not immediate free space. Test a representative compaction or rebuild at high-water capacity and confirm foreground latency and ingest remain within objectives.

## Conclusion

Forecast storage by measuring stored bytes per accepted unit, integrating forecast ingest over retention, and applying the platform's exact durability scheme. Add visible steady overhead and measured temporary workspace, then enforce a safe fill threshold per failure domain. Revalidate compaction, deletion, rebuild, and expansion time so a paper byte total remains operationally usable.

## Official Documentation

- [Prometheus storage sizing, retention, and compaction](https://prometheus.io/docs/prometheus/latest/storage/)
- [Apache Cassandra compaction overview](https://cassandra.apache.org/doc/stable/cassandra/managing/operating/compaction/overview.html)
- [Apache Cassandra compression](https://cassandra.apache.org/doc/stable/cassandra/managing/operating/compression.html)
- [Apache Cassandra storage and compaction metrics](https://cassandra.apache.org/doc/stable/cassandra/managing/operating/metrics.html)
- [Elasticsearch disk allocation watermarks](https://www.elastic.co/guide/en/elasticsearch/reference/current/modules-cluster.html#disk-based-shard-allocation)
