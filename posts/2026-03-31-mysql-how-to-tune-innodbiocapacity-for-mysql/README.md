# How to Tune innodb_io_capacity for MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Performance Tuning, I/O, Database

Description: Learn how to tune innodb_io_capacity and innodb_io_capacity_max in MySQL to match your storage hardware and reduce I/O-related performance bottlenecks.

---

## What Is innodb_io_capacity

`innodb_io_capacity` tells InnoDB how many I/O operations per second (IOPS) your storage can handle. InnoDB uses this value to throttle background tasks such as flushing dirty pages from the buffer pool to disk and merging the change buffer.

Setting it too low causes dirty pages to accumulate, leading to sudden I/O storms when InnoDB is forced to flush aggressively. Setting it too high causes excessive background I/O that steals resources from foreground query activity.

## Default Values and Their Problems

```sql
SHOW VARIABLES LIKE 'innodb_io_capacity%';
```

```text
+------------------------+-------+
| Variable_name          | Value |
+------------------------+-------+
| innodb_io_capacity     | 200   |
| innodb_io_capacity_max | 2000  |
+------------------------+-------+
```

The default of 200 IOPS is suitable for a single spinning HDD. Modern SSDs and NVMe drives deliver 10,000-500,000+ IOPS. Using the default on SSD means InnoDB is severely under-using available I/O capacity, causing dirty page buildup.

## Measure Your Storage IOPS

Before tuning, benchmark your storage:

```bash
# Install fio
apt-get install fio

# Test random write IOPS (simulates InnoDB writes)
fio --name=iops-test \
    --ioengine=libaio \
    --rw=randwrite \
    --bs=16k \
    --numjobs=4 \
    --iodepth=32 \
    --size=4G \
    --runtime=60 \
    --time_based \
    --output-format=normal
```

Look for the `write: IOPS=` line in the output. A typical result:

```text
write: IOPS=45.2k, BW=706MiB/s
```

## Set innodb_io_capacity Based on Storage Type

| Storage Type | Typical IOPS | Recommended Setting |
|--------------|-------------|---------------------|
| Single HDD   | 100-200     | 200 (default)       |
| SATA SSD     | 20,000-80,000 | 2000-4000          |
| NVMe SSD     | 100,000-500,000 | 4000-20000        |
| AWS gp3 EBS  | Up to 16,000 | 2000-4000          |
| AWS io2 EBS  | Up to 256,000 | 20000-50000        |

## Apply the Settings

In `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```text
[mysqld]
# For SSD storage with ~20,000 IOPS
innodb_io_capacity_max = 8000
innodb_io_capacity = 4000
```

Or set dynamically (set the max first, since `innodb_io_capacity` cannot exceed `innodb_io_capacity_max`):

```sql
SET GLOBAL innodb_io_capacity_max = 8000;
SET GLOBAL innodb_io_capacity = 4000;
```

The `innodb_io_capacity_max` value is used during aggressive flushing (when the buffer pool is very full). Set it to 2x `innodb_io_capacity`.

## Monitor Dirty Page Accumulation

```sql
-- Check dirty pages
SHOW STATUS LIKE 'Innodb_buffer_pool_pages_dirty';

-- As a percentage of total buffer pool pages
SELECT
  variable_value AS dirty_pages
FROM performance_schema.global_status
WHERE variable_name = 'Innodb_buffer_pool_pages_dirty';

SELECT
  variable_value AS total_pages
FROM performance_schema.global_status
WHERE variable_name = 'Innodb_buffer_pool_pages_total';
```

If dirty pages consistently exceed 30-40% of the buffer pool, `innodb_io_capacity` is too low.

## innodb_flush_sync and Adaptive Flushing

MySQL 8.0 includes adaptive flushing, which automatically adjusts the flush rate based on redo log generation speed. Enable it (it is on by default):

```sql
SHOW VARIABLES LIKE 'innodb_adaptive_flushing%';
```

```text
+-----------------------------------+-------+
| Variable_name                     | Value |
+-----------------------------------+-------+
| innodb_adaptive_flushing          | ON    |
| innodb_adaptive_flushing_lwm      | 10    |
+-----------------------------------+-------+
```

Adaptive flushing uses `innodb_io_capacity_max` as its ceiling during bursts.

## Check I/O Statistics

```sql
SELECT * FROM performance_schema.file_summary_by_event_name
WHERE event_name LIKE '%innodb%'
ORDER BY sum_timer_wait DESC
LIMIT 10;
```

## Summary

`innodb_io_capacity` is the primary knob for controlling InnoDB's background I/O throughput. Set it to reflect your actual storage IOPS - typically 2000-4000 for SATA SSD and 4000-20000 for NVMe. Set `innodb_io_capacity_max` to 2x the base value. Monitor dirty page percentage to verify the setting is preventing dirty page accumulation.
