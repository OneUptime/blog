# Validation Summary: How to Use ClickHouse Migrations for Schema Changes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree, ReplicatedMergeTree engines)
- ClickHouse SQL DDL (ALTER TABLE, CREATE TABLE, system tables)
- ClickHouse client CLI (`clickhouse-client`)
- Bash scripting (migration runner)
- GitHub Actions CI/CD

## Sources Consulted
- ClickHouse ALTER TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/alter/column
- ClickHouse CREATE TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/create/table
- ClickHouse system.mutations table: https://clickhouse.com/docs/en/operations/system-tables/mutations
- ClickHouse system.merges table: https://clickhouse.com/docs/en/operations/system-tables/merges
- ClickHouse data skipping indexes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse MATERIALIZE COLUMN: https://clickhouse.com/docs/en/sql-reference/statements/alter/column#materialize-column
- ClickHouse installation on Debian/Ubuntu: https://clickhouse.com/docs/en/install
- GitHub Actions checkout action: https://github.com/actions/checkout

## Issues Found

### 1. Missing MATERIALIZE COLUMN step in column type change pattern (V012/V013)
**What was wrong:** The column type change pattern added a new column with `DEFAULT toUInt64(user_id)` but never materialized the column on existing data parts. With only a DEFAULT expression, existing parts don't physically store the new column data — the value is computed at read time from the referenced column. When V013 drops the original `user_id` column, existing parts that haven't been materialized would lose access to the DEFAULT expression's dependency, causing errors or data loss.

**What was changed:** Added `ALTER TABLE events MATERIALIZE COLUMN user_id_v2;` to V012 so existing data parts physically store the column value before the original column is dropped. Updated the V013 comment to instruct readers to verify the MATERIALIZE COLUMN mutation is complete before proceeding.

### 2. CI/CD ClickHouse client installation missing repository setup
**What was wrong:** The GitHub Actions workflow used `sudo apt-get install -y clickhouse-client` which would fail because the `clickhouse-client` package is not in Ubuntu's default apt repositories. The ClickHouse apt repository must be added first.

**What was changed:** Added the ClickHouse apt repository setup steps (GPG key import and sources list entry) before the `apt-get install` command.

### 3. CI/CD script path referenced non-existent location on CI runner
**What was wrong:** The workflow referenced `/usr/local/bin/clickhouse-migrate.sh` which wouldn't exist on a fresh CI runner. The script was described earlier in the post as a local file, but in CI it needs to come from the checked-out repository.

**What was changed:** Changed the `run` commands to reference `./clickhouse-migrate.sh` (repo-local path) and added a `chmod +x` step for the first invocation.

### 4. Outdated GitHub Actions checkout version
**What was wrong:** Used `actions/checkout@v3` which is outdated.

**What was changed:** Updated to `actions/checkout@v4`.

## Review Notes
- The migration runner bash script uses `grep -oP` (PCRE regex) and `md5sum`, which are GNU/Linux-specific. On macOS, these would need `grep -oE` and `md5` respectively. Since the script targets Linux/CI environments, this is acceptable but worth noting for readers on macOS.
- The `date +%s%3N` for millisecond timestamps is GNU date-specific and does not work on macOS. Same caveat as above.
- The bash script interpolates variables directly into SQL strings (e.g., `'${VERSION}'`, `'${DESCRIPTION}'`). If migration filenames contained single quotes, this could break SQL parsing. Since filenames are developer-controlled and follow a naming convention, this is acceptable for a blog pattern but would need escaping in production-hardened tooling.
- The `--multiquery` flag on `clickhouse-client` is enabled by default in ClickHouse 22.x+ and the flag is deprecated but still accepted. The script's usage remains backward-compatible.
- All ClickHouse SQL syntax (CREATE TABLE, ALTER TABLE, system table queries, KILL MUTATION, TTL, skip indexes, COMMENT clause) is correct and current.
- DDL behavior claims (ADD COLUMN is metadata-only, DROP COLUMN triggers mutation, MODIFY COLUMN depends on rewrite, UPDATE/DELETE are mutations) are accurate.
