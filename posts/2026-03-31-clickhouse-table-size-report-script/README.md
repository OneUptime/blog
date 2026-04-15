# How to Write a ClickHouse Table Size Report Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Script, Monitoring, Storage, Administration

Description: Build a shell script that queries ClickHouse system tables to produce a table size report showing compressed size, row counts, and compression ratios.

---

## Why a Table Size Report?

As ClickHouse stores grow to terabytes, it becomes essential to know which tables and partitions consume the most space. A regular size report helps you identify candidates for TTL policies, compression tuning, or partition pruning.

## The Report Script

```bash
#!/usr/bin/env bash
# clickhouse-table-size-report.sh

CH_HOST="${CH_HOST:-localhost}"
CH_PORT="${CH_PORT:-8123}"
CH_USER="${CH_USER:-default}"
CH_PASSWORD="${CH_PASSWORD:-}"

run_query() {
    curl -s "http://${CH_HOST}:${CH_PORT}/" \
        -u "${CH_USER}:${CH_PASSWORD}" \
        --data-binary "$1"
}

echo "=== ClickHouse Table Size Report - $(date) ==="
echo ""

echo "--- Top 20 Tables by Compressed Size ---"
run_query "
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS disk_size,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes) / sum(data_compressed_bytes), 2) AS compression_ratio,
    formatReadableQuantity(sum(rows)) AS total_rows
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC
LIMIT 20
FORMAT PrettyCompactMonoBlock
"

echo ""
echo "--- Partition Breakdown for Large Tables ---"
run_query "
SELECT
    database,
    table,
    partition,
    count() AS parts,
    formatReadableSize(sum(bytes_on_disk)) AS size,
    formatReadableQuantity(sum(rows)) AS rows
FROM system.parts
WHERE active = 1 AND bytes_on_disk > 1073741824
GROUP BY database, table, partition
ORDER BY sum(bytes_on_disk) DESC
LIMIT 30
FORMAT PrettyCompactMonoBlock
"
```

## Making It Executable and Scheduling

```bash
chmod +x clickhouse-table-size-report.sh

# Add to crontab for daily reports
(crontab -l 2>/dev/null; echo "0 8 * * * /opt/scripts/clickhouse-table-size-report.sh >> /var/log/ch-size-report.log 2>&1") | crontab -
```

## Adding Email Alerts for Growth

Extend the script to alert when a table exceeds a threshold:

```bash
LARGE_TABLES=$(run_query "
SELECT count() FROM system.parts
WHERE active = 1 AND bytes_on_disk > 107374182400
GROUP BY database, table
HAVING sum(bytes_on_disk) > 107374182400
FORMAT TabSeparated
")

if [ -n "$LARGE_TABLES" ]; then
    echo "$LARGE_TABLES" | mail -s "ClickHouse: Tables over 100 GB" ops@example.com
fi
```

## Viewing Column-Level Compression

```bash
run_query "
SELECT
    table,
    name AS column,
    formatReadableSize(sum(data_compressed_bytes)) AS compressed,
    formatReadableSize(sum(data_uncompressed_bytes)) AS uncompressed,
    round(sum(data_uncompressed_bytes)/sum(data_compressed_bytes), 2) AS ratio
FROM system.columns
WHERE database = 'default'
GROUP BY table, name
ORDER BY sum(data_compressed_bytes) DESC
LIMIT 20
FORMAT PrettyCompactMonoBlock
"
```

## Summary

A ClickHouse table size report script queries `system.parts` and `system.columns` to surface disk usage, row counts, and compression ratios. Running it daily as a cron job and adding threshold alerts gives you proactive visibility into storage growth before it causes capacity issues.
