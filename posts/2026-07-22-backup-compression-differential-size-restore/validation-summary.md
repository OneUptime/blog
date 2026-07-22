# Validation Summary: How Backup Compression Affects Differential Backup Size and Restore Time

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft SQL Server backup and restore
- Transact-SQL (`BACKUP DATABASE`, backup history queries, and backup options)
- Backup compression, including MS_XPRESS and SQL Server 2025 ZSTD
- Differential backups and Differential Change Map semantics
- Resource Governor
- Backup encryption and Transparent Data Encryption (TDE)
- Backup checksums and `DBCC CHECKDB`

## Sources Consulted
- Microsoft SQL Server backup compression — https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-compression-sql-server?view=sql-server-ver17
- BACKUP (Transact-SQL) syntax and option semantics — https://learn.microsoft.com/en-us/sql/t-sql/statements/backup-transact-sql?view=sql-server-ver17
- Configure backup compression — https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/configure-backup-compression-sql-server?view=sql-server-ver17
- Behavior of compressed backups when appending to a media set — https://learn.microsoft.com/en-us/troubleshoot/sql/database-engine/backup-restore/behavior-compressed-backups
- `backupset` system table — https://learn.microsoft.com/en-us/sql/relational-databases/system-tables/backupset-transact-sql?view=sql-server-ver17
- Differential backups — https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/differential-backups-sql-server?view=sql-server-ver17
- Copy-only backups — https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/copy-only-backups-sql-server?view=sql-server-ver17
- Complete database restores under the full recovery model — https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/complete-database-restores-full-recovery-model?view=sql-server-ver17
- RESTORE compatibility support — https://learn.microsoft.com/en-us/sql/t-sql/statements/restore-statements-transact-sql?view=sql-server-ver17
- Use Resource Governor to limit backup-compression CPU — https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/use-resource-governor-to-limit-cpu-usage-by-backup-compression-transact-sql?view=sql-server-ver17
- SQL Server backup encryption — https://learn.microsoft.com/en-us/sql/relational-databases/backup-restore/backup-encryption?view=sql-server-ver17
- SQL Server data compression — https://learn.microsoft.com/en-us/sql/relational-databases/data-compression/data-compression?view=sql-server-ver17
- Transparent Data Encryption — https://learn.microsoft.com/en-us/sql/relational-databases/security/encryption/transparent-data-encryption?view=sql-server-ver17
- DBCC CHECKDB (Transact-SQL) — https://learn.microsoft.com/en-us/sql/t-sql/database-console-commands/dbcc-checkdb-transact-sql?view=sql-server-ver17
- SQL Server 2025 known issues — https://learn.microsoft.com/en-us/sql/sql-server/sql-server-2025-known-issues?view=sql-server-ver17

## Issues Found

1. **`INIT` was not distinguished from media-set reformatting**: The post correctly said compressed and uncompressed backups cannot coexist in one media set, but “consistent media initialization” was ambiguous next to a sample that uses `INIT`. `INIT` overwrites backup sets while preserving the media header, so it cannot fix a compression-setting mismatch. The text now recommends a unique file or, after confirming existing contents may be discarded, `FORMAT` to create a new media set.

2. **Differential restore timing was phrased too broadly**: “Differential restore time also includes the matching full” could be read as describing the duration of the differential `RESTORE` statement itself. The text now says that an end-to-end differential recovery requires restoring the matching full first.

3. **Encrypted-data terminology was imprecise**: “Encrypted-looking data” was replaced with the documented cases of column-level and application-level encryption, which can reduce the backup-compression ratio.

4. **Backup-encryptor recovery requirements needed qualification**: The original wording treated every encryptor as a locally preserved private key. The revision now distinguishes backing up a certificate and its private key from preserving an EKM asymmetric key and access to its provider. It also separates CPU/throughput testing of backup encryption from compression-ratio testing of the source data's encryption state.

## Review Notes
- The `msdb.dbo.backupset` query is syntactically valid. Backup types `D` and `I`, `backup_size`, `compressed_backup_size`, and `has_backup_checksums` are used correctly.
- The `BACKUP DATABASE` example and its `DIFFERENTIAL`, `COMPRESSION`, `CHECKSUM`, `INIT`, and `STATS` options are valid. The target directory must exist and be writable by the SQL Server service account.
- The SQL Server 2025 ZSTD claim is current, and MS_XPRESS remains the default compression algorithm. Microsoft currently documents a known issue with setting the server-level `backup compression algorithm` option to ZSTD; the documented workaround is to select ZSTD directly with `WITH COMPRESSION (ALGORITHM = ZSTD)`. The post does not instruct readers to use the affected server setting, so no additional correction was required.
- For TDE-enabled databases, optimized backup compression is version-sensitive: SQL Server 2016 and later can use it with `MAXTRANSFERSIZE` greater than 64 KB, while SQL Server 2019 CU5 and later automatically raise the value when compression is enabled. The post's recommendation to benchmark the exact environment remains appropriate.
