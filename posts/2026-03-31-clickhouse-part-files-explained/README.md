# How ClickHouse Stores Data on Disk - Part Files Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Storage, MergeTree, Internal, Disk

Description: Understand how ClickHouse organizes data into part directories on disk, what each file inside a part contains, and how merges affect storage layout.

---

## What Is a Data Part?

Every INSERT into a MergeTree table creates an immutable directory called a "part" on disk. Parts are later merged in the background to reduce their count and improve query performance. Understanding the file layout inside a part is key to tuning storage and diagnosing issues.

## Locating Parts on Disk

```bash
ls /var/lib/clickhouse/data/default/events/
```

You will see directories like `20240101_1_1_0`, `20240101_2_5_1`. The naming follows:

```text
{partition_id}_{min_block}_{max_block}_{merge_level}
```

## Files Inside a Part

Navigate into any part directory:

```bash
ls /var/lib/clickhouse/data/default/events/20240101_1_1_0/
```

Typical output:

```text
checksums.txt
columns.txt
count.txt
data.bin
data.mrk3
minmax_event_date.idx
primary.idx
serialization.json
```

### primary.idx

Stores the sparse primary index. ClickHouse writes one index entry (a mark) every `index_granularity` rows (default 8192). This file stays in memory during queries.

### data.bin

In compact parts, all column data is stored in a single `data.bin` file. In wide parts, each column has its own `.bin` file instead (e.g., `user_id.bin`, `event_type.bin`).

### data.mrk3

Mark files link index entries to byte offsets in `.bin` files. The `.mrk3` format (used since ClickHouse 21.x) supports adaptive granularity.

### columns.txt

Lists all column names and their types at the time the part was written.

### count.txt

Contains the exact row count for the part - used to answer `SELECT count()` without scanning data.

### checksums.txt

CityHash128 checksums for every file in the part, used to detect corruption.

### minmax_{column}.idx

Min/max index files for partition key columns. ClickHouse uses these to skip entire parts during queries.

## Wide vs. Compact Parts

For small inserts, ClickHouse may use a compact format where all columns are stored in a single `data.bin` file instead of separate per-column files. Check which format a part uses:

```sql
SELECT name, part_type
FROM system.parts
WHERE table = 'events' AND active = 1
LIMIT 10;
```

## Monitoring Part Count

Excessive parts (thousands) degrade query performance. Monitor with:

```sql
SELECT partition, count() AS parts
FROM system.parts
WHERE table = 'events' AND active = 1
GROUP BY partition
ORDER BY parts DESC;
```

If parts exceed a few hundred per partition, investigate your insert frequency or review merge-related settings such as `max_bytes_to_merge_at_max_space_in_pool` and `parts_to_delay_insert`.

## Summary

ClickHouse stores each insert batch as an immutable part directory containing column data files, mark files, a sparse primary index, and metadata. Understanding these files helps you tune index granularity, diagnose corruption via checksums, and optimize merges for better query performance.
