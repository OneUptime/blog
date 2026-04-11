# How to Use mysqldump with Compression in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Backup, mysqldump, Compression, Storage

Description: Learn how to compress MySQL backups using gzip, bzip2, and zstd with mysqldump to reduce storage costs and speed up backup transfers.

---

MySQL backup files can grow very large on production systems. A 10 GB database can easily produce a 10 GB or larger `mysqldump` file. Compressing these files during backup reduces storage requirements by 70-90% for typical SQL dumps, speeds up file transfers, and reduces backup storage costs. Since `mysqldump` outputs to stdout, it integrates seamlessly with Linux compression tools.

## Compressing with gzip (Most Common)

Pipe `mysqldump` output directly into `gzip`:

```bash
mysqldump -u root -p \
  --single-transaction \
  --quick \
  myapp \
  | gzip > /backup/myapp_$(date +%Y%m%d_%H%M%S).sql.gz
```

## Faster Compression with pigz (Parallel gzip)

`pigz` uses multiple CPU cores to compress faster:

```bash
# Install pigz
apt install pigz

mysqldump -u root -p \
  --single-transaction \
  myapp \
  | pigz -p 4 > /backup/myapp_$(date +%Y%m%d).sql.gz
```

## Better Compression Ratio with bzip2

`bzip2` produces smaller files than gzip but is slower:

```bash
mysqldump -u root -p \
  --single-transaction \
  myapp \
  | bzip2 > /backup/myapp_$(date +%Y%m%d).sql.bz2
```

## Best Compression with xz

`xz` (LZMA) achieves the best compression ratios, ideal for long-term archival:

```bash
mysqldump -u root -p \
  --single-transaction \
  myapp \
  | xz -T 4 > /backup/myapp_$(date +%Y%m%d).sql.xz
```

## Fast Compression with zstd

`zstd` provides excellent compression speed with good ratios, ideal for nightly backups:

```bash
# Install zstd
apt install zstd

mysqldump -u root -p \
  --single-transaction \
  myapp \
  | zstd -o /backup/myapp_$(date +%Y%m%d).sql.zst
```

## Compression Comparison

```text
Format  | Compression | Speed  | CPU Usage | Extension
--------|-------------|--------|-----------|----------
gzip    | Good        | Fast   | Low       | .sql.gz
pigz    | Good        | Faster | High      | .sql.gz
bzip2   | Better      | Slow   | Medium    | .sql.bz2
xz      | Best        | Slow   | High      | .sql.xz
zstd    | Good        | Fast   | Low-Med   | .sql.zst
```

## Compressing Client-Server Communication

MySQL can compress data transferred between `mysqldump` and the server (useful for remote backups). This is separate from output file compression. Use `--compression-algorithms` to enable it:

```bash
mysqldump -u root -p \
  --compression-algorithms=zlib \
  --single-transaction \
  --host=remote-db.example.com \
  myapp \
  | gzip > /backup/myapp_remote_$(date +%Y%m%d).sql.gz
```

Note: The older `--compress` flag was deprecated in MySQL 8.0.18 and removed in MySQL 8.4. Use `--compression-algorithms` (with values `zlib`, `zstd`, or `uncompressed`) instead. For zstd, you can also set `--zstd-compression-level` (1-22, default 3).

## Restoring from Compressed Backups

```bash
# Restore from .gz
gunzip < /backup/myapp_20260331.sql.gz | mysql -u root -p myapp

# Or using zcat
zcat /backup/myapp_20260331.sql.gz | mysql -u root -p myapp

# Restore from .bz2
bzcat /backup/myapp_20260331.sql.bz2 | mysql -u root -p myapp

# Restore from .xz
xzcat /backup/myapp_20260331.sql.xz | mysql -u root -p myapp

# Restore from .zst
zstd -d < /backup/myapp_20260331.sql.zst | mysql -u root -p myapp
```

## Verifying Compressed Backup Integrity

```bash
# Verify gzip file is not corrupted
gzip -t /backup/myapp_20260331.sql.gz && echo "OK"

# Preview first lines without full decompression
zcat /backup/myapp_20260331.sql.gz | head -20
```

## Summary

Compressing `mysqldump` output with `gzip`, `zstd`, or `xz` dramatically reduces backup file sizes. Pipe mysqldump output through compression tools and restore by piping decompressed output back into `mysql`. For daily production backups, `gzip` or `zstd` offer the best balance of speed and compression ratio, while `xz` is better suited for long-term archival where storage is the primary concern.
