# How to Use the split Command to Divide Large Files on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Command Line, Linux, Shell, System Administration

Description: Learn how to split large files into manageable pieces on Ubuntu using the split command, covering line-based, size-based, and chunk-based splitting with reassembly techniques.

---

When files grow too large to transfer via email, upload to certain services, or keep in a single manageable unit, the `split` command on Ubuntu provides a straightforward way to divide them. It can split by line count, byte size, or number of chunks, and reassembling the pieces is equally simple.

## Basic Syntax

```bash
split [OPTIONS] [INPUT [PREFIX]]
```

By default, `split` creates files named `xaa`, `xab`, `xac`, and so on (using the `x` prefix and two-letter suffixes). You can specify a custom prefix.

## Splitting by Line Count

The default split mode divides a file every 1000 lines:

```bash
# Split into 1000-line chunks (default)
split large_file.txt

# Creates: xaa, xab, xac, ...

# Specify line count with -l
split -l 500 large_file.txt

# Split into 100-line chunks with custom prefix
split -l 100 large_file.txt chunk_
# Creates: chunk_aa, chunk_ab, chunk_ac, ...
```

Verify the split worked:

```bash
# Count lines in original
wc -l large_file.txt

# Count lines in all chunks
wc -l chunk_* | tail -1
```

## Splitting by File Size

The `-b` flag splits by byte count:

```bash
# Split into 10MB chunks
split -b 10M large_archive.tar.gz part_

# Split into 1GB chunks for a large backup
split -b 1G huge_backup.tar.gz backup_part_

# Size suffixes:
# K = kilobytes (1024 bytes)
# M = megabytes (1024*1024 bytes)
# G = gigabytes
# KB = 1000 bytes (no power-of-two)
# MB = 1000*1000 bytes
```

For binary files, always use size-based splitting rather than line-based splitting.

## Using Numeric Suffixes

By default, `split` uses alphabetic suffixes (aa, ab, ac...). The `-d` flag uses numeric suffixes instead:

```bash
# Use numeric suffixes: 00, 01, 02, ...
split -b 100M -d large_file.tar.gz part_
# Creates: part_00, part_01, part_02, ...

# Specify suffix length with -a
split -b 100M -d -a 3 large_file.tar.gz part_
# Creates: part_000, part_001, part_002, ...
```

Numeric suffixes are often easier to work with when sorting or processing chunks in order.

## Splitting into N Chunks

The `-n` flag splits a file into exactly N pieces of approximately equal size:

```bash
# Split into exactly 5 chunks
split -n 5 large_file.csv chunk_

# Split into 10 chunks with numeric suffix
split -n 10 -d data.bin part_

# Split into chunks and process in parallel
split -n 8 large_data.txt chunk_ && ls chunk_*
```

This is useful when you want a specific number of pieces rather than a specific size.

## Keeping Lines Intact with -n l/N

When splitting text files into N chunks while keeping line boundaries:

```bash
# Split into 4 chunks, never cutting in the middle of a line
split -n l/4 records.txt part_

# Split into N chunks, output only chunk K without creating files
split -n l/3/10 large.csv  # output chunk 3 of 10 to stdout
```

## Reassembling Split Files

Reassemble with `cat` - simply concatenate the pieces in order:

```bash
# Reassemble alphabetically sorted pieces (xaa, xab, xac...)
cat x* > reassembled_file.txt

# Safer: sort explicitly and reassemble
cat $(ls chunk_* | sort) > reassembled.txt

# For numeric suffixes, sort works correctly
cat part_* > reassembled_archive.tar.gz

# Verify the result matches original
md5sum original.tar.gz
md5sum reassembled_archive.tar.gz
```

## Verifying Integrity

Always verify reassembled files match the original:

```bash
# Generate checksum before splitting
sha256sum important_backup.tar.gz > important_backup.sha256

# After reassembly, verify
sha256sum -c important_backup.sha256
```

Or check file size:

```bash
# Compare sizes
ls -lh original_file.tar.gz
cat part_* > reassembled.tar.gz && ls -lh reassembled.tar.gz
```

## Practical Use Cases

### Splitting a Large CSV for Parallel Processing

```bash
# Split a 10M row CSV into 8 chunks for parallel processing
# Keep the header in each chunk using a workaround

HEADER=$(head -1 large_data.csv)
tail -n +2 large_data.csv | split -n l/8 - chunk_

# Add header to each chunk
for f in chunk_*; do
    { echo "$HEADER"; cat "$f"; } > tmp && mv tmp "$f"
done

# Now process chunks in parallel
for f in chunk_*; do
    python process_data.py "$f" &
done
wait
```

### Splitting Log Files by Size for Archiving

```bash
# Archive large log directory, splitting into 500MB chunks
tar czf - /var/log/app/ | split -b 500M - logs_archive_

# Add date to prefix
DATE=$(date +%Y%m%d)
tar czf - /var/log/app/ | split -b 500M - "logs_${DATE}_"

# Verify all chunks are present
ls -lh logs_*
```

### Preparing Files for Email or Cloud Upload

Some services impose file size limits. Split a large file into uploadable chunks:

```bash
# Split into 25MB pieces (common email attachment limit)
split -b 25M -d -a 2 report.pdf report_part_

# List pieces with sizes
ls -lh report_part_*

# Recipient reassembles with:
cat report_part_* > report.pdf
```

### Splitting for Network Transfer

When transferring a large file over an unreliable connection, splitting allows resuming from a specific chunk:

```bash
# Split database dump into 1GB chunks
split -b 1G -d -a 3 database_dump.sql.gz db_dump_

# Transfer each chunk (can retry individual pieces)
for part in db_dump_*; do
    scp "$part" user@remote:/backup/ && echo "$part transferred"
done

# On remote - reassemble
cat /backup/db_dump_* > /backup/database_dump.sql.gz
```

## Using split with stdin

`split` can read from standard input when you use `-` or omit the filename:

```bash
# Split output of another command
pg_dump mydb | split -b 500M - dump_part_

# Split compressed stream
tar czf - /data/ | split -b 1G -d - backup_

# Split into lines from a pipe
cat access.log | grep "ERROR" | split -l 10000 - error_chunk_
```

## Monitoring Progress

For large files, `split` can take a while. Use `pv` (pipe viewer) to monitor progress:

```bash
# Install pv
sudo apt install pv

# Split with progress indicator
pv large_file.tar.gz | split -b 500M - part_

# Or monitor the growing output files
watch 'ls -lh part_* | tail -5'
```

## Quick Reference

```bash
# By line count
split -l 1000 file.txt prefix_

# By size
split -b 100M file.bin prefix_

# Into N chunks
split -n 10 file.txt prefix_

# Into N chunks, line-aligned
split -n l/10 file.txt prefix_

# Numeric suffixes
split -d file.txt prefix_

# From stdin
command | split -b 500M - prefix_

# Reassemble
cat prefix_* > original_file
```

`split` is most valuable when combined with checksums for verification, numeric suffixes for clarity, and `cat` for simple reassembly. The pattern of `split`, transfer/process, then `cat` to reassemble covers a wide range of practical scenarios.
