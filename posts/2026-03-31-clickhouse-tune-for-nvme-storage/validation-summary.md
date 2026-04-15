# Validation Summary: How to Tune ClickHouse for NVMe Storage

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse (MergeTree engine, storage configuration, merge/insert settings)
- Linux block layer tuning (I/O scheduler, queue depth, read-ahead)
- NVMe storage (nvme-cli, sysfs tunables)
- Linux udev rules

## Sources Consulted
- Linux Kernel block queue sysfs documentation: https://www.kernel.org/doc/html/latest/block/queue-sysfs.html
- Red Hat Performance Tuning Guide (storage and file systems): https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-storage_and_file_systems-configuration_tools
- ClickHouse MergeTree settings documentation: https://clickhouse.com/docs/operations/settings/merge-tree-settings
- ClickHouse session/query settings documentation: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse storage policies documentation: https://clickhouse.com/docs/operations/system-tables/storage_policies
- Altinity Knowledge Base — aggressive merges: https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-aggressive_merges/
- nvme-cli smart-log man page: https://manpages.debian.org/testing/nvme-cli/nvme-smart-log.1.en.html
- Western Digital NVMe Queues Explained: https://blog.westerndigital.com/nvme-queues-explained/

## Issues Found

1. **`nr_requests` mislabeled as "hardware queue depth"**: The post described `nr_requests` as the "hardware queue depth," but it is actually the Linux block layer (software) request queue depth — the number of I/O requests the block layer will queue per hardware queue context. The actual hardware queue depth is a separate parameter. Fixed the description to say "block layer request queue depth" instead.

2. **`max_insert_threads` shown as bare config.xml element**: `max_insert_threads` is a query-level / session-level setting in ClickHouse. Placing it as a bare element in `config.xml` would cause an error. Changed the example to use a `SET` statement for per-query use, and added a `users.xml` profile example for setting it as a persistent default.

## Review Notes
- The `background_pool_size` and `background_merges_mutations_concurrency_ratio` settings are correctly placed in config.xml as server-level settings (confirmed for ClickHouse 23.3+). Their defaults are 16 and 2 respectively; the suggested values of 32 and 4 are reasonable for NVMe workloads.
- The NVMe spec claim of "up to 64K queues with 64K entries each" is accurate (65,535 I/O queues, 65,536 entries each), though real devices typically expose far fewer.
- The udev rule kernel pattern `nvme[0-9]n[0-9]` only matches single-digit controller and namespace numbers. Systems with 10+ NVMe devices would need a broader pattern like `nvme*n*`, but this covers the vast majority of deployments.
- The `nvme smart-log /dev/nvme0` command correctly targets the controller device, which is valid per the nvme-cli man page.
