# Validation Summary: How to Tune ClickHouse for SSD Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (MergeTree engine settings, server configuration)
- Linux I/O scheduler (mq-deadline, none)
- Linux sysfs block device tuning (nr_requests, read_ahead_kb)
- SSD storage (TRIM/DISCARD, fstrim)
- systemd (fstrim.timer)
- ext4 filesystem mount options

## Sources Consulted
- ClickHouse documentation on MergeTree settings (min_merge_bytes_to_use_direct_io, min_bytes_for_wide_part, min_rows_for_wide_part, merge_max_block_size)
- ClickHouse documentation on server settings (background_pool_size, background_merges_mutations_concurrency_ratio, fsync_metadata, max_read_buffer_size)
- ClickHouse system tables documentation (system.asynchronous_metrics)
- Linux kernel documentation on block device I/O schedulers (/sys/block/*/queue/scheduler)
- Linux kernel documentation on block device queue parameters (nr_requests, read_ahead_kb)
- Linux udev rules documentation
- Linux fstrim and TRIM/DISCARD documentation

## Issues Found
1. **`fsync_metadata` value contradicted the section title**: The section "Disable SSD Write Cache Flush (with UPS)" described how to disable fsync for higher write throughput when UPS protection is available, but the XML config showed `<fsync_metadata>true</fsync_metadata>`, which keeps fsync *enabled* (the safe default). Changed to `<fsync_metadata>false</fsync_metadata>` to match the section's stated purpose. The existing caveat text ("Keep `fsync_metadata` enabled unless you accept data loss risk on power failure") already warns the reader about the tradeoff.

## Review Notes
- The "Increase Queue Depth" section sets `read_ahead_kb` to 64, which is a read-ahead buffer size setting rather than a queue depth setting. It is commonly tuned alongside `nr_requests` for SSDs, and the value is reasonable (lower than the typical 128 KB default), but the section title is slightly misleading.
- Several MergeTree settings shown (`merge_max_block_size = 8192`, `min_bytes_for_wide_part = 10485760`, `min_merge_bytes_to_use_direct_io = 10737418240`) are the ClickHouse defaults. They are not incorrect, but showing defaults doesn't actively "tune" anything — they serve more as documentation of recommended baseline values.
- The `max_read_buffer_size` value of 1048576 (1 MB) is also the ClickHouse default. Same note as above.
- The post recommends both periodic TRIM (`fstrim.timer`) and continuous discard (`discard` mount option). Best practice generally favors periodic TRIM over continuous discard for performance reasons; the post correctly presents periodic TRIM first.
