# How to Configure InnoDB Doublewrite Buffer in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Doublewrite Buffer, Durability, Configuration

Description: Learn how the InnoDB doublewrite buffer protects against partial page writes in MySQL and how to configure or disable it for your workload.

---

## What Is the InnoDB Doublewrite Buffer?

The InnoDB doublewrite buffer is a data integrity mechanism that protects against partial page writes. A partial write occurs when MySQL writes a 16KB page to disk but a crash interrupts the operation, leaving the page half-written on disk.

Before writing pages to their final data file locations, InnoDB first writes them to a dedicated doublewrite buffer area. If a crash occurs during the actual data file write, InnoDB can recover the page from the doublewrite buffer on restart.

## Checking Whether Doublewrite Is Enabled

```sql
SHOW VARIABLES LIKE 'innodb_doublewrite';
```

```text
+--------------------+-------+
| Variable_name      | Value |
+--------------------+-------+
| innodb_doublewrite | ON    |
+--------------------+-------+
```

The doublewrite buffer is enabled by default and should remain enabled on most production systems.

## Doublewrite Buffer Location in MySQL 8.0.20+

Starting in MySQL 8.0.20, the doublewrite buffer was moved from the system tablespace to separate doublewrite files. This reduces contention and allows the files to be placed on fast storage.

```text
[mysqld]
innodb_doublewrite_dir = /var/lib/mysql-doublewrite
innodb_doublewrite_files = 4
innodb_doublewrite_pages = 64
```

- `innodb_doublewrite_dir` - directory for doublewrite files (defaults to data directory).
- `innodb_doublewrite_files` - number of doublewrite files (default: 2 x number of buffer pool instances).
- `innodb_doublewrite_pages` - maximum number of pages per thread to write at once.

Verify the files:

```bash
ls -lh /var/lib/mysql-doublewrite/
```

```text
-rw-r----- 1 mysql mysql 2.0M Mar 31 10:00 #ib_16384_0.dblwr
-rw-r----- 1 mysql mysql 2.0M Mar 31 10:00 #ib_16384_1.dblwr
```

## When to Disable the Doublewrite Buffer

You may consider disabling the doublewrite buffer in specific cases:

- **File systems with atomic writes** (e.g., ZFS, Fusion-io): these guarantee page-level atomicity at the storage layer.
- **Read replicas**: crash recovery on a replica is handled by re-syncing from the source, so doublewrite overhead may not be worth it.
- **Benchmark or testing environments**: where data durability is not required.

To disable:

```text
[mysqld]
innodb_doublewrite = OFF
```

In MySQL 8.0.30+, `innodb_doublewrite` can be changed dynamically between enabled states (`ON`, `DETECT_AND_RECOVER`, `DETECT_ONLY`), but it cannot be dynamically changed to `OFF`. Disabling the doublewrite buffer requires a server restart.

## Performance Impact

The doublewrite buffer adds roughly one extra write per page write. On most modern SSDs and with MySQL 8.0.20+ separate doublewrite files, the overhead is typically 5-10% of write throughput.

Check doublewrite writes:

```sql
SHOW GLOBAL STATUS LIKE 'Innodb_dblwr%';
```

```text
+----------------------------+----------+
| Variable_name              | Value    |
+----------------------------+----------+
| Innodb_dblwr_pages_written | 1024000  |
| Innodb_dblwr_writes        | 65536    |
+----------------------------+----------+
```

A ratio of `Innodb_dblwr_pages_written / Innodb_dblwr_writes` close to 1 means each write batch is small - this is typical on low-traffic systems.

## Monitoring for Partial Write Events

InnoDB logs partial write recovery in the error log:

```text
[InnoDB] Recovered page [page id: space=2, page number=45] from the doublewrite buffer.
```

These messages after a crash confirm the doublewrite buffer prevented data corruption.

## Summary

The InnoDB doublewrite buffer prevents data corruption from partial page writes by staging pages before writing them to data files. In MySQL 8.0.20+, doublewrite files are separate from the system tablespace, reducing I/O contention. Disable it only on filesystems with native atomic write support or non-critical read replicas where the performance trade-off is justified.
