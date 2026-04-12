# Validation Summary: How to Set Up MongoDB Data Directory and Storage Options

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (mongod, mongosh)
- WiredTiger storage engine
- Linux systemd (systemctl)
- XFS / ext4 filesystems

## Sources Consulted
- MongoDB Manual — storage.dbPath configuration: https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-storage.dbPath
- MongoDB Manual — WiredTiger Storage Engine: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Manual — Journaling: https://www.mongodb.com/docs/manual/core/journaling/
- MongoDB Manual — Configure Journaling for Self-Managed Deployments: https://www.mongodb.com/docs/manual/tutorial/manage-journaling/
- Percona Blog — Compression Methods in MongoDB (Snappy vs Zstd): https://www.percona.com/blog/compression-methods-in-mongodb-snappy-vs-zstd/

## Issues Found

### 1. Inaccurate default data directory description
- **What was wrong:** The post stated "MongoDB uses `/var/lib/mongodb` on Linux" as the default, which is only true for Debian/Ubuntu package installations. The `mongod` binary itself defaults to `/data/db`, and RHEL/CentOS packages use `/var/lib/mongo`.
- **What was changed:** Clarified that the mongod binary defaults to `/data/db`, with package installations overriding to `/var/lib/mongodb` (Debian/Ubuntu) or `/var/lib/mongo` (RHEL/CentOS).
- **Why:** Readers running mongod without the package-provided config, or on RHEL-based systems, would find the wrong directory.

### 2. Removed deprecated `storage.journal.enabled` option
- **What was wrong:** The configuration snippet included `journal: enabled: true` under `storage`. This option was removed in MongoDB 6.1 and will cause a startup error on modern versions.
- **What was changed:** Removed the `journal.enabled` setting from the config example and added a note explaining that journaling is always enabled in MongoDB 6.1+ and the option was removed.
- **Why:** Including this option would prevent mongod from starting on MongoDB 6.1, 7.x, and 8.x.

### 3. Missing `zstd` from journalCompressor options
- **What was wrong:** The list of valid `journalCompressor` values was "snappy, zlib, none", omitting `zstd`.
- **What was changed:** Added `zstd` to the list: "snappy, zlib, zstd, none".
- **Why:** `zstd` has been a valid journal compressor since MongoDB 4.2 and is a commonly used option.

## Review Notes
- The WiredTiger cache size default description ("50% of RAM minus 1 GB") is correct, with a minimum of 256 MB.
- All WiredTiger YAML configuration field names (`storage.wiredTiger.engineConfig.cacheSizeGB`, etc.) are accurate.
- The XFS and `noatime` recommendations align with official MongoDB production notes.
- The `db.serverStatus().storageEngine` verification command is correct.
- The `sudo mv` approach for moving the data directory works but `rsync -a` or `cp -a` would be safer for cross-filesystem moves, as they better preserve attributes. This is a minor point and not changed.
