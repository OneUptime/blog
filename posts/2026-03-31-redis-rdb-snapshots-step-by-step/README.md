# How RDB Snapshots Work in Redis Step by Step

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RDB, Persistence, Internal

Description: Understand the exact sequence of operations Redis performs during an RDB snapshot, including forking, copy-on-write, and atomic file replacement.

---

RDB snapshots are Redis's point-in-time persistence mechanism. Understanding the internal steps helps you predict memory usage, optimize snapshot frequency, and diagnose failures.

## Step 1: Trigger

A snapshot starts either automatically (based on `save` thresholds), manually via `BGSAVE`, or triggered by a replica requesting a full sync.

```bash
# Check when a snapshot last ran and if one is in progress
redis-cli INFO persistence
```

```text
rdb_last_save_time:1711900800
rdb_current_bgsave_time_sec:-1   # -1 means no save in progress
```

## Step 2: Fork

Redis calls `fork()` to create a child process. This is nearly instantaneous because Linux uses copy-on-write - the parent and child share the same physical memory pages initially.

```text
# Redis log during fork
Background saving started by pid 12345
```

On large instances, the fork itself can cause a brief latency spike (the fork system call takes time proportional to the number of memory pages):

```bash
redis-cli INFO stats | grep latest_fork_usec
```

```text
latest_fork_usec:25000   # 25 milliseconds for a 10 GB instance
```

## Step 3: Child Writes the RDB File

The child process serializes the entire dataset into a temporary file (typically `temp-<pid>.rdb`). While writing:

- The child reads each key from its copy of memory
- Serializes each key-value pair using the compact RDB format
- Writes to the temporary file sequentially

The RDB file format starts with a magic header and version:

```text
REDIS0011...
```

Where `0011` is the RDB format version. The child writes all databases, their key-value pairs, and expiry times.

## Step 4: Copy-on-Write Occurs

While the child is writing, the parent continues serving client requests. Every time the parent writes to a memory page that the child is also reading, the kernel duplicates that page (copy-on-write). The child sees the original data while the parent operates on the new copy.

Monitor COW overhead:

```bash
redis-cli INFO persistence | grep rdb_last_cow_size
```

```text
rdb_last_cow_size:8388608   # 8 MB of pages were copied
```

High values indicate many writes are occurring during the snapshot window.

## Step 5: Checksum and Completion

After writing all data, the child computes an 8-byte CRC64 checksum and appends it to the file. This allows Redis to detect file corruption on load.

The child exits, sending a signal to the parent.

## Step 6: Atomic File Replacement

The parent receives the child's exit signal. If the child succeeded:

1. The temporary file `temp-<pid>.rdb` is renamed to `dump.rdb`
2. This rename is atomic on POSIX filesystems
3. No client sees a partial or corrupt file

If the child failed, the old `dump.rdb` is preserved untouched.

```text
# Redis log on success
Background saving terminated with success
```

## Step 7: Metadata Update

Redis updates internal metadata:

```bash
redis-cli INFO persistence
```

```text
rdb_last_save_time:1711900900   # Updated Unix timestamp
rdb_last_bgsave_status:ok
rdb_last_bgsave_time_sec:3      # How long the save took
rdb_last_cow_size:8388608
```

## Step 8: Load on Restart

When Redis restarts with an existing `dump.rdb`:

1. Opens and validates the file magic header and format version
2. Loads all key-value pairs into memory, including their expiry times (expiry is stored inline with each key in the RDB format)
3. Verifies the CRC64 checksum at the end of the file (computed incrementally during loading)
4. Begins serving requests

For a 10 GB dataset, this typically takes 8-15 seconds, far faster than replaying an AOF file.

## Summary

An RDB snapshot proceeds in these phases: trigger, fork, child serialization with parent copy-on-write, CRC checksum, atomic file replacement, and metadata update. The fork is nearly instantaneous but scales with dataset size. Monitor `latest_fork_usec` for fork latency and `rdb_last_cow_size` for copy-on-write overhead. On restart, RDB loading is fast because it bulk-loads binary data rather than replaying individual commands.
