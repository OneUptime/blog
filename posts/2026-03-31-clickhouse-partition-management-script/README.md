# How to Write a ClickHouse Partition Management Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Partition, Script, Administration, Data Lifecycle

Description: Build a partition management script for ClickHouse that lists partitions, detaches old ones, drops expired data, and moves partitions between disks.

---

## Why Manage Partitions Manually?

While TTL handles automatic data expiry, there are cases where manual partition management is needed: bulk deletes, moving cold data to cheaper storage, detaching partitions for backup, or dropping specific date ranges immediately without waiting for TTL.

## The Partition Management Script

```bash
#!/usr/bin/env bash
# clickhouse-partition-manager.sh

CH_HOST="${CH_HOST:-localhost}"
CH_PORT="${CH_PORT:-8123}"
CH_USER="${CH_USER:-default}"
CH_PASSWORD="${CH_PASSWORD:-}"
TARGET_DB="${1:-default}"
TARGET_TABLE="${2:-events}"

run_query() {
    curl -s "http://${CH_HOST}:${CH_PORT}/" \
        -u "${CH_USER}:${CH_PASSWORD}" \
        --data-binary "$1"
}

list_partitions() {
    echo "--- Partitions for ${TARGET_DB}.${TARGET_TABLE} ---"
    run_query "
    SELECT
        partition,
        count() AS parts,
        formatReadableSize(sum(bytes_on_disk)) AS size,
        formatReadableQuantity(sum(rows)) AS rows,
        min(min_date) AS min_date,
        max(max_date) AS max_date
    FROM system.parts
    WHERE database = '${TARGET_DB}' AND table = '${TARGET_TABLE}' AND active = 1
    GROUP BY partition
    ORDER BY partition
    FORMAT PrettyCompactMonoBlock
    "
}

drop_old_partitions() {
    local KEEP_MONTHS="${1:-3}"
    local CUTOFF=$(date -d "-${KEEP_MONTHS} months" +%Y%m)
    echo "Dropping partitions older than ${CUTOFF}..."

    run_query "
    SELECT DISTINCT partition
    FROM system.parts
    WHERE database = '${TARGET_DB}' AND table = '${TARGET_TABLE}'
      AND active = 1 AND partition < '${CUTOFF}'
    FORMAT TabSeparated
    " | while read -r partition; do
        echo "  Dropping partition: ${partition}"
        run_query "ALTER TABLE ${TARGET_DB}.${TARGET_TABLE} DROP PARTITION '${partition}'"
    done
}

detach_partition() {
    local PARTITION="$1"
    echo "Detaching partition ${PARTITION}..."
    run_query "ALTER TABLE ${TARGET_DB}.${TARGET_TABLE} DETACH PARTITION '${PARTITION}'"
}

attach_partition() {
    local PARTITION="$1"
    echo "Attaching partition ${PARTITION}..."
    run_query "ALTER TABLE ${TARGET_DB}.${TARGET_TABLE} ATTACH PARTITION '${PARTITION}'"
}

# --- Command dispatcher ---
ACTION="${3:-list}"
shift 3 2>/dev/null || true

case "$ACTION" in
    list)    list_partitions ;;
    drop)    drop_old_partitions "$1" ;;
    detach)  detach_partition "$1" ;;
    attach)  attach_partition "$1" ;;
    *)       echo "Usage: $0 <database> <table> {list|drop|detach|attach} [arg]"; exit 1 ;;
esac
```

## Moving Partitions to Cold Storage

With ClickHouse storage tiering (using disks defined in `storage_policy`):

```bash
move_partition_to_cold() {
    local PARTITION="$1"
    echo "Moving partition ${PARTITION} to cold disk..."
    run_query "
    ALTER TABLE ${TARGET_DB}.${TARGET_TABLE}
    MOVE PARTITION '${PARTITION}' TO DISK 'cold_disk'
    "
}
```

## Freezing Partitions for Backup

```bash
freeze_partition() {
    local PARTITION="$1"
    echo "Freezing partition ${PARTITION}..."
    run_query "
    ALTER TABLE ${TARGET_DB}.${TARGET_TABLE}
    FREEZE PARTITION '${PARTITION}'
    "
    echo "Frozen parts available at: /var/lib/clickhouse/shadow/"
}
```

## Usage Examples

```bash
# List all partitions
./clickhouse-partition-manager.sh default events list

# Drop partitions older than 6 months
./clickhouse-partition-manager.sh default events drop 6

# Detach a specific partition
./clickhouse-partition-manager.sh default events detach 202312
```

## Summary

A ClickHouse partition management script wraps `ALTER TABLE ... DROP/DETACH/ATTACH/MOVE PARTITION` commands with reporting and filtering logic. Automating old partition cleanup and cold-tier moves reduces storage costs while keeping recent data on fast disks for low-latency queries.
