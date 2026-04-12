# How to Defragment MySQL Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Defragmentation, Performance, OPTIMIZE

Description: Learn how to defragment MySQL InnoDB tables using OPTIMIZE TABLE, ALTER TABLE ENGINE, and pt-online-schema-change to reclaim space and improve performance.

---

## Why Defragmenting MySQL Tables Helps

After heavy delete or update workloads, InnoDB table pages accumulate internal free space. Rows are removed but pages remain allocated, creating "holes" in the B-tree. Over time this leads to:
- Range scans reading more pages than necessary
- Storage growth without corresponding data growth
- Index operations scanning fragmented leaf pages

Defragmentation rebuilds the table compactly, packing pages to their optimal fill level.

## Checking If Defragmentation Is Needed

Before defragmenting, verify fragmentation is present:

```sql
SELECT
  table_name,
  ROUND(data_length / 1048576, 2) AS data_mb,
  ROUND(data_free / 1048576, 2) AS free_mb,
  ROUND(data_free / (data_length + index_length + data_free) * 100, 1) AS waste_pct
FROM information_schema.TABLES
WHERE table_schema = DATABASE()
  AND engine = 'InnoDB'
HAVING waste_pct > 10
ORDER BY free_mb DESC;
```

Only defragment tables where `waste_pct` exceeds 10-15% and `free_mb` is significant.

## Method 1 - OPTIMIZE TABLE

`OPTIMIZE TABLE` is the simplest defragmentation command:

```sql
OPTIMIZE TABLE orders;
```

MySQL outputs a result like:

```text
+-------------+----------+----------+--------------------------------------------------------------------+
| Table       | Op       | Msg_type | Msg_text                                                           |
+-------------+----------+----------+--------------------------------------------------------------------+
| mydb.orders | optimize | note     | Table does not support optimize, doing recreate + analyze instead   |
| mydb.orders | optimize | status   | OK                                                                 |
+-------------+----------+----------+--------------------------------------------------------------------+
```

The "note" row is expected for InnoDB tables and does not indicate a problem.

Under the hood, InnoDB maps this to `ALTER TABLE ... FORCE`, which rebuilds the table. In MySQL 8.0, this uses online DDL so it does not block reads or writes for most operations.

## Method 2 - ALTER TABLE ENGINE

Explicitly running the ALTER TABLE is equivalent but makes the intent clearer:

```sql
ALTER TABLE orders ENGINE=InnoDB;
```

You can combine defragmentation with other changes to avoid multiple rebuilds:

```sql
ALTER TABLE orders
  ENGINE=InnoDB,
  ROW_FORMAT=COMPRESSED,
  KEY_BLOCK_SIZE=8;
```

## Method 3 - pt-online-schema-change

For multi-hundred-GB tables on production servers, use `pt-online-schema-change` to avoid any metadata lock contention:

```bash
pt-online-schema-change \
  --alter "ENGINE=InnoDB" \
  --execute \
  --user=root \
  --password=secret \
  --progress=percentage,10 \
  --chunk-size=2000 \
  --sleep=0.05 \
  D=mydb,t=orders
```

The `--chunk-size` and `--sleep` options throttle the copy to reduce impact on production queries.

## Defragmenting Indexes Separately

Indexes can also fragment. Rebuild a specific index without a full table rebuild:

```sql
ALTER TABLE orders DROP INDEX idx_user_id, ADD INDEX idx_user_id (user_id);
```

This rebuilds the index B-tree compactly. For tables with multiple indexes, a full table rebuild with `OPTIMIZE TABLE` is more efficient.

## Scheduling Regular Defragmentation

For tables with heavy delete workloads, schedule weekly defragmentation during maintenance windows:

```bash
#!/bin/bash
# Run on tables with > 500 MB free space
mysql -u root -psecret -e "
SELECT CONCAT('OPTIMIZE TABLE ', table_schema, '.', table_name, ';')
FROM information_schema.TABLES
WHERE engine='InnoDB'
  AND data_free > 524288000
  AND table_schema NOT IN ('mysql','information_schema','performance_schema','sys')
" --batch --skip-column-names | mysql -u root -psecret
```

## Verifying Results

After defragmentation, confirm free space is reduced:

```sql
SELECT table_name, data_free
FROM information_schema.TABLES
WHERE table_schema = 'mydb' AND table_name = 'orders';
```

`data_free` should be close to 0 immediately after a rebuild.

## Summary

Defragment MySQL tables using `OPTIMIZE TABLE` for simple cases or `pt-online-schema-change` for large production tables requiring zero downtime. Check fragmentation with `information_schema.TABLES` `data_free` column before and after. Schedule defragmentation for tables with heavy delete workloads, and combine with other ALTER TABLE operations when possible to avoid multiple table rebuilds.
