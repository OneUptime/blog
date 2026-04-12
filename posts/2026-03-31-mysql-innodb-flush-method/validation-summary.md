# Validation Summary: How to Configure InnoDB Flush Method in MySQL

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL (8.0 and 8.4+)
- InnoDB storage engine
- Linux I/O subsystem (fsync, O_DIRECT, strace, iostat)

## Sources Consulted
- MySQL 8.0 Reference Manual — InnoDB Startup Options and System Variables: https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.4 Reference Manual — InnoDB Startup Options and System Variables: https://dev.mysql.com/doc/refman/8.4/en/innodb-parameters.html
- MySQL 8.4 Optimizing InnoDB Disk I/O: https://dev.mysql.com/doc/refman/8.4/en/optimizing-innodb-diskio.html
- Percona Server InnoDB I/O documentation: https://docs.percona.com/percona-server/8.0/innodb-io.html

## Issues Found

1. **O_DIRECT_NO_FSYNC log file behavior (table, line 29)**: The table incorrectly stated that log writes use `write() + fsync()` under `O_DIRECT_NO_FSYNC`. Per official MySQL documentation, `O_DIRECT_NO_FSYNC` skips `fsync()` for data files, log files, and parallel doublewrite files. Fixed the table entry to `write() (no fsync)` and updated the descriptive text to explicitly list all three file types.

2. **Default value version caveat (line 20)**: The post stated `fsync` is the default without version qualification. MySQL 8.4+ changed the default to `O_DIRECT` on Linux. Updated to specify `fsync` (default in MySQL 8.0) and `O_DIRECT` (default in MySQL 8.4+).

3. **littlesync log write syscall (table, line 30)**: The table claimed `littlesync` uses `write() + fsync()` for log files. Official MySQL documentation only describes `littlesync` as "used for internal performance testing" without specifying exact syscalls. Changed to `undocumented (internal)` to avoid stating unverifiable claims.

4. **strace command (line 157)**: The strace command traced `open,write` but `O_DIRECT` is a flag on `open()`/`openat()` syscalls, not `write()`. Modern Linux uses `openat()` almost exclusively. Fixed to `open,openat`.

## Review Notes
- The `innodb_flush_method` variable remains non-dynamic (requires restart) across all current MySQL versions (8.0, 8.4, 9.x), which the post correctly states.
- The post's recommendation of `O_DIRECT` for production is well-aligned with MySQL 8.4+ making it the default.
- The double-buffering explanation and the 32 GB / 64 GB memory example are directionally correct simplifications — not all buffer pool pages are necessarily duplicated in the OS page cache, but it illustrates the worst case effectively.
- The decision guide correctly recommends `fsync` for NFS mounts, where `O_DIRECT` can be problematic.
