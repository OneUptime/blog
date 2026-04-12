# Validation Summary: How to Use InnoDB Transparent Page Compression in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- InnoDB Storage Engine
- InnoDB Transparent Page Compression (COMPRESSION table attribute)
- zlib and LZ4 compression algorithms
- Linux filesystem sparse file / hole-punching support (ext4, xfs, btrfs, ZFS)

## Sources Consulted
- MySQL 8.0 Reference Manual: InnoDB Page Compression — https://dev.mysql.com/doc/refman/8.0/en/innodb-page-compression.html
- MySQL 8.0 Reference Manual: CREATE TABLE Statement (COMPRESSION option) — https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 Reference Manual: ALTER TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/alter-table.html
- MySQL 8.0 Reference Manual: OPTIMIZE TABLE Statement — https://dev.mysql.com/doc/refman/8.0/en/optimize-table.html
- MySQL 8.0 Reference Manual: innodb_file_per_table — https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html#sysvar_innodb_file_per_table
- Linux man page: fallocate(1) — https://man7.org/linux/man-pages/man1/fallocate.1.html

## Issues Found

1. **Contradictory comment on ALTER TABLE (line 68)**: The comment said "triggers a full rebuild" but the immediately following comment correctly stated the ALTER alone does NOT physically compress existing pages. Fixed the comment to say "metadata change only, no rebuild" since `ALTER TABLE ... COMPRESSION` only updates the table's compression attribute in the data dictionary — it does not trigger a table rebuild. A subsequent `OPTIMIZE TABLE` is needed to physically rewrite pages in compressed form.

2. **Mermaid diagram logic error in read path (lines 134-135)**: The "No" (not compressed) branch from the "Compressed?" decision node incorrectly fed into the "Decompress to buffer pool page size" node. Uncompressed pages do not need decompression. Fixed the diagram so the "No" branch goes directly to "Page ready in buffer pool", while the "Yes" branch goes through decompression first.

3. **`fallocate -d` on non-existent file (line 41)**: The command `fallocate -d /var/lib/mysql/test_sparse_file` would fail if the file does not already exist, since `fallocate -d` (dig holes) operates on an existing file. Added a preceding `dd` command to create a small test file first, so the hole-punching test actually works.

## Review Notes
- The post states "Supported compression algorithms: `zlib`, `lz4` (MySQL 8.0+)". Transparent page compression was actually introduced in MySQL 5.7.8 with both zlib and lz4 support. Since the post is framed around MySQL 8.0 usage throughout, this is not incorrect but could be more precise by noting 5.7+ availability.
- The post correctly notes that `innodb_file_per_table = ON` is required and is the default in MySQL 8.0. It has actually been the default since MySQL 5.6.6.
- All SQL syntax (`COMPRESSION = 'zlib'`, `COMPRESSION = 'lz4'`, `COMPRESSION = 'none'`) is correct per MySQL 8.0 documentation.
- The information_schema queries and bash commands for measuring compression savings are correct. Using `du` vs `ls` to compare actual disk usage vs apparent file size is the right approach for sparse files.
- The zlib vs LZ4 comparison table is accurate in its general characterizations.
