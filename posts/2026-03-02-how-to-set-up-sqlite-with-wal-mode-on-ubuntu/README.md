# How to Set Up SQLite with WAL Mode on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SQLite, Database, Performance

Description: Configure SQLite's Write-Ahead Logging mode on Ubuntu to enable concurrent reads during writes, reduce lock contention, and improve overall database throughput.

---

SQLite's default journaling mode - called DELETE journal - works by writing the original page contents to a rollback journal before modifying the database. This approach is simple and reliable, but it causes readers to block writers and vice versa, creating contention in multi-user scenarios.

Write-Ahead Logging (WAL) flips this model: changes are appended to a separate WAL file instead of modifying the database file directly. Readers read the original database file while writers append to the WAL file, so readers and writers do not block each other. This makes WAL mode significantly faster for most real-world workloads.

## How WAL Mode Works

In WAL mode:

1. Writers append new page versions to the WAL file (`database.db-wal`)
2. Readers read from the main database file, checking the WAL for newer page versions
3. Periodically, WAL pages are written back to the main database file in a process called a checkpoint
4. A shared memory file (`database.db-shm`) coordinates access between processes

The key properties of WAL mode:
- Multiple readers can run concurrently with a writer
- Only one writer at a time (SQLite's single-writer limitation still applies)
- Reads do not block writes
- Writes do not block reads
- Transactions commit faster because they only write to the WAL, not the main file

## Enabling WAL Mode

WAL mode is set per-database and persists across connections.

```bash
# Open the database and enable WAL mode
sqlite3 /data/myapp.db "PRAGMA journal_mode=WAL;"
# Returns: wal

# Verify the mode is active
sqlite3 /data/myapp.db "PRAGMA journal_mode;"
# Returns: wal

# You will now see these files alongside the database
ls -la /data/myapp.db*
# myapp.db       - main database file
# myapp.db-shm   - shared memory file (index into WAL)
# myapp.db-wal   - write-ahead log file
```

Once WAL mode is set, every subsequent connection to that database automatically uses WAL mode - you do not need to set it again for each connection. However, the synchronous and cache settings still need to be set per-connection.

## Recommended Configuration with WAL

WAL mode pairs well with `PRAGMA synchronous=NORMAL`, which is safer than `OFF` and faster than `FULL`.

```sql
-- Recommended WAL configuration
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- With synchronous=NORMAL and WAL, SQLite guarantees:
-- - No data loss on application crash
-- - Possible (but very unlikely) data loss on OS crash
-- - This is acceptable for most applications

-- For maximum safety (matching PostgreSQL's default durability)
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
```

## Setting WAL Mode Programmatically

In application code, set WAL mode on the first connection before other operations.

```python
import sqlite3

def initialize_database(db_path):
    """Initialize database with WAL mode and optimal settings."""
    conn = sqlite3.connect(db_path)

    # Enable WAL mode - persists across future connections
    result = conn.execute('PRAGMA journal_mode=WAL;').fetchone()
    if result[0] != 'wal':
        raise RuntimeError(f'Failed to enable WAL mode, got: {result[0]}')

    # These settings apply per-connection
    conn.executescript('''
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = -32768;
        PRAGMA temp_store = MEMORY;
        PRAGMA mmap_size = 268435456;
    ''')

    return conn

# Initialize once, then use normally
conn = initialize_database('/data/myapp.db')

# All subsequent connections will use WAL automatically
# but still need the per-connection PRAGMAs
def get_connection(db_path):
    conn = sqlite3.connect(db_path)
    conn.executescript('''
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = -32768;
        PRAGMA temp_store = MEMORY;
    ''')
    return conn
```

## WAL File Size and Checkpointing

The WAL file grows as writes happen. It is periodically checkpointed back to the main database file. By default, an automatic checkpoint triggers after 1000 pages are written to the WAL.

```sql
-- Check current WAL autocheckpoint setting
PRAGMA wal_autocheckpoint;
-- Default: 1000

-- Increase to reduce checkpoint frequency (better write throughput)
-- but larger WAL file means slower reads (must scan more WAL entries)
PRAGMA wal_autocheckpoint = 5000;

-- Disable automatic checkpointing (manual control)
PRAGMA wal_autocheckpoint = 0;
```

### Manual Checkpointing

For fine-grained control, disable auto-checkpoint and run it manually during low traffic.

```bash
# PASSIVE: write back WAL pages that can be done without blocking readers
sqlite3 /data/myapp.db "PRAGMA wal_checkpoint(PASSIVE);"

# FULL: wait for readers to finish, then write all WAL pages back
sqlite3 /data/myapp.db "PRAGMA wal_checkpoint(FULL);"

# TRUNCATE: full checkpoint + truncate WAL file to zero length
sqlite3 /data/myapp.db "PRAGMA wal_checkpoint(TRUNCATE);"
# Returns: 0|0|0 (if successful: wal-log|frames-written|frames-checkpointed)
```

### Setting Up Automated Checkpointing

Create a cron job to checkpoint during off-peak hours.

```bash
# Create a checkpoint script
cat > /usr/local/bin/sqlite-checkpoint.sh << 'EOF'
#!/bin/bash
# Checkpoint SQLite WAL files for all databases in /data

find /data -name "*.db" -type f | while read db; do
    if [ -f "${db}-wal" ]; then
        sqlite3 "$db" "PRAGMA wal_checkpoint(TRUNCATE);"
        echo "Checkpointed: $db"
    fi
done
EOF

chmod +x /usr/local/bin/sqlite-checkpoint.sh

# Add to crontab (runs at 3 AM daily)
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/sqlite-checkpoint.sh >> /var/log/sqlite-checkpoint.log 2>&1") | crontab -
```

## Monitoring WAL File Size

A large WAL file (many MB or GB) indicates the checkpoint is not keeping up with writes. Monitor it.

```bash
# Check WAL file size
ls -lh /data/myapp.db-wal

# Monitor WAL size over time
watch -n 5 'ls -lh /data/myapp.db-wal 2>/dev/null || echo "No WAL file"'

# Get WAL stats via PRAGMA (returns: busy-page-count|log-size|frames-checkpointed)
sqlite3 /data/myapp.db "PRAGMA wal_checkpoint(PASSIVE);"
```

## Switching Back to DELETE Journal Mode

You can switch back to DELETE mode if needed, though this is uncommon.

```sql
-- Switch back to DELETE journal mode
PRAGMA journal_mode = DELETE;
-- Returns: delete

-- The -shm and -wal files are removed automatically after switching
-- (SQLite waits for all connections to close first)
```

## WAL Mode Limitations

WAL mode has a few constraints to be aware of:

**No network file systems** - WAL mode requires shared memory (`-shm` file), which does not work reliably over NFS, CIFS, or other network file systems. Use DELETE journal mode for databases on network storage.

```bash
# Check if your filesystem supports WAL
stat -f -c '%T' /data/
# Should be ext4, xfs, btrfs, etc. - not nfs or cifs
```

**Read-only databases** - If the database file is read-only, WAL mode cannot be used because the `-shm` file cannot be created.

**File synchronization** - Backing up a WAL-mode database requires copying both the main database file and the WAL file together. The `-shm` file does not need to be backed up.

```bash
# Proper backup of WAL-mode database
sqlite3 /data/myapp.db ".backup /backup/myapp_backup.db"
# The .backup command uses the SQLite backup API which handles WAL correctly

# Or use the VACUUM INTO approach
sqlite3 /data/myapp.db "VACUUM INTO '/backup/myapp_clean.db';"
```

For most Ubuntu applications that use SQLite, enabling WAL mode is a simple, low-risk change that yields measurable performance improvements, particularly when multiple processes or threads access the same database concurrently.
