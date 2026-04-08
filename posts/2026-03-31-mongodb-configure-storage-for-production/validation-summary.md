# Validation Summary: How to Configure MongoDB Storage for Production

## Status
validated

## Post Type
Tutorial / Production Configuration Guide

## Technologies Covered
- MongoDB (WiredTiger storage engine)
- Linux disk management (ext4, fstab, mount options)
- Linux I/O schedulers (none, mq-deadline)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual: WiredTiger Storage Engine Configuration — https://www.mongodb.com/docs/manual/reference/configuration-options/#storage-options
- MongoDB Manual: storage.wiredTiger options — https://www.mongodb.com/docs/manual/reference/configuration-options/#storage.wiredTiger.engineConfig.cacheSizeGB
- MongoDB Manual: Journaling — https://www.mongodb.com/docs/manual/core/journaling/
- MongoDB Manual: storage.journal.enabled deprecation (MongoDB 6.1+) — https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.journal.enabled
- MongoDB Manual: serverStatus wiredTiger cache metrics — https://www.mongodb.com/docs/manual/reference/command/serverStatus/#wiredtiger
- Linux kernel documentation: blk-mq I/O schedulers (mq-deadline vs legacy deadline)

## Issues Found

1. **cacheSizeGB inconsistency**: The YAML config set `cacheSizeGB: 14` but the detailed calculation in the bash comments below recommended 18 (32GB - 8GB OS - 4-6GB indexes = 18-20GB). Changed the YAML value from 14 to 18 to match the calculation.

2. **Missing journal separation instructions**: Step 4 was titled "Separate Journal Directory" and mentioned placing the journal on a separate disk, but only showed `journal.enabled` and `commitIntervalMs` settings without any instructions for actually separating the journal. Added the symlink-based approach (`mv` journal directory to separate SSD and `ln -s` back) which is the standard method for MongoDB.

3. **Deprecated `storage.journal.enabled`**: The `storage.journal.enabled: true` setting is redundant for WiredTiger (journaling cannot be disabled since MongoDB 4.0) and the option itself is deprecated since MongoDB 6.1. Removed the line.

4. **Outdated I/O scheduler name**: Changed `deadline` to `mq-deadline` for SATA SSDs, as modern Linux kernels using blk-mq use `mq-deadline` rather than the legacy `deadline` scheduler.

## Review Notes
- The compression ratio table provides approximate ranges that are reasonable but will vary significantly by workload. This is acceptable as presented.
- The `db.collection.stats()` method used in the monitoring scripts is functional but note that `db.collection.aggregate([{$collStats: {storageStats: {}}}])` is the preferred approach in newer MongoDB versions.
- The `free -g` command rounds to whole gigabytes which may be imprecise; `free -m` with manual conversion could be more accurate, but this is minor.
- The post recommends XFS implicitly via ext4 usage; MongoDB officially recommends XFS for WiredTiger workloads due to better performance with large files and preallocation. This is not an error but worth noting for a future update.
