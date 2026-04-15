# Validation Summary: How to Verify ClickHouse Backup Integrity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (native BACKUP/RESTORE SQL statements)
- ClickHouse `CHECK TABLE` statement
- clickhouse-backup (Altinity third-party backup tool)
- AWS S3 (backup storage)
- Python 3 (manifest parsing scripts)
- boto3 (AWS SDK for Python)
- Bash scripting (automation)

## Sources Consulted
- ClickHouse official documentation — CHECK TABLE statement: https://clickhouse.com/docs/sql-reference/statements/check-table
- ClickHouse official documentation — BACKUP and RESTORE: https://clickhouse.com/docs/operations/backup/overview
- ClickHouse official documentation — Backup to S3: https://clickhouse.com/docs/operations/backup/s3_endpoint
- ClickHouse source code — BackupImpl.h and BackupImpl.cpp (backup metadata format): https://github.com/ClickHouse/ClickHouse/blob/master/src/Backups/BackupImpl.h
- Altinity clickhouse-backup GitHub repository (CLI commands): https://github.com/Altinity/clickhouse-backup
- ClickHouse PR #62206 — confirms `async` as a valid SETTINGS parameter for BACKUP/RESTORE

## Issues Found

### 1. Backup manifest described as JSON — actually XML (Critical)
**What was wrong:** The post stated the `.backup` manifest file is JSON and used `json.load()` in Python scripts to parse it. ClickHouse's native backup writes the `.backup` manifest in XML format with a `<config>` root element containing `<contents><file>` entries.
**What was changed:** Rewrote all manifest-parsing Python scripts to use `xml.etree.ElementTree`. Updated the description from "This JSON file" to "This XML file". Changed local file extensions from `.json` to `.xml` for clarity.
**Why:** The original code would fail with a `json.JSONDecodeError` when parsing the actual ClickHouse backup manifest.

### 2. Incorrect `ALTER TABLE ... CHECK PARTITION` syntax (Error)
**What was wrong:** The post used `ALTER TABLE my_database_verified.events CHECK PARTITION '202403';` — `CHECK PARTITION` is not an `ALTER TABLE` operation in ClickHouse.
**What was changed:** Corrected to `CHECK TABLE my_database_verified.events PARTITION '202403';`.
**Why:** `CHECK TABLE ... PARTITION` is the correct ClickHouse syntax. `ALTER TABLE` supports partition operations like DROP, DETACH, ATTACH, and MOVE, but not CHECK.

### 3. Non-existent `clickhouse-backup verify` command (Error)
**What was wrong:** The post claimed `clickhouse-backup` has a built-in `verify` subcommand. This command does not exist — the tool has 14 subcommands (tables, create, create_remote, upload, list, download, restore, restore_remote, delete, default-config, print-config, clean, clean_remote_broken, clean_local_broken, watch, server) but `verify` is not among them.
**What was changed:** Replaced with `clickhouse-backup list` (to check backup metadata) and `clickhouse-backup restore --schema` (schema-only restore as a verification step). Updated the introductory text to remove the claim about a "built-in verify command".
**Why:** Running `clickhouse-backup verify` would produce `Error. Unknown command: 'verify'` and exit with code 1.

### 4. Checksum validation script improved (Minor)
**What was wrong:** The original script used `s3.get_object()` and read the entire file body into memory to check size, which is wasteful for large backup files.
**What was changed:** Replaced with `s3.head_object()` which retrieves only metadata (including `ContentLength`) without downloading the file body.
**Why:** More efficient for size validation; avoids downloading potentially large data files just to check their size.

## Review Notes
- The `RESTORE ... SETTINGS async = false` syntax is valid but redundant — `false` is already the default. Left as-is since it makes the intent explicit, which is reasonable in a tutorial context.
- The row count comparison between source and restored databases is a sound approach, but could yield false positives if the source database receives writes between backup creation and verification. The post does not mention this caveat.
- The inconsistent naming between `my_database_verified` (SQL section) and `my_database_verify_YYYYMMDD` (bash script) could be confusing to readers, but both are independent examples.
- The `date -d 'last sunday'` in the cron entry is GNU date syntax (Linux). The post correctly includes a macOS fallback with `date -v-sun`, which is good cross-platform practice.
