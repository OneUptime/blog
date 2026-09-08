# How to Reclaim SQLite Space with VACUUM and Incremental Auto-Vacuum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQLite, Disk Space, Database, Performance, Storage

Description: Measure reclaimable SQLite pages, choose a full rebuild or incremental reclamation, and validate the database around maintenance.

---

With auto-vacuum disabled, deleting rows adds any pages that become entirely unused to SQLite's freelist so later inserts can reuse them. Space freed within pages still in use remains available within those pages. The database file stays large, but that does not mean the space is wasted. Reclaim space back to the filesystem only when the operating benefit exceeds the locking, I/O, flash wear, and temporary-space cost.

## Measure before changing anything

Query the page size, total pages, freelist, and current auto-vacuum mode:

```sql
PRAGMA page_size;
PRAGMA page_count;
PRAGMA freelist_count;
PRAGMA auto_vacuum;
```

Estimate unused whole-page capacity as:

```text
freelist bytes = page_size * freelist_count
freelist ratio = freelist_count / page_count
```

This does not include partially filled pages, which a full `VACUUM` may compact. Track the ratio over time. If the same database will soon regrow, keeping reusable pages can be faster and gentler on flash than shrinking and extending the file repeatedly.

Take a database-aware backup and verify it before any full rebuild or auto-vacuum mode change.

## Use full VACUUM for a planned rebuild

`VACUUM` reconstructs the database into a temporary file and copies the compacted result back:

```sql
VACUUM;
```

Plan it as a write operation. It fails if the same connection has an open transaction. Unfinalized statements can keep a transaction open and cause it to fail, and it needs a write lock that other connections can block. SQLite documents that the process can require up to twice the original database size in free disk space. Check capacity on the filesystem holding SQLite temporary and database files.

Run it during a maintenance window with stable power. A full rewrite can be expensive on large databases and increases flash writes. Tables without an explicit `INTEGER PRIMARY KEY` may receive different rowids, so applications must not treat undocumented rowids as durable external identifiers.

After completion, verify:

```sql
PRAGMA integrity_check;
PRAGMA foreign_key_check;
PRAGMA page_count;
PRAGMA freelist_count;
```

Then exercise application reads and writes and record the actual space saved and elapsed time. In WAL mode, changes reach the main database file through checkpointing, so filesystem shrinkage can be delayed. Include the WAL file when measuring disk usage; a checkpoint normally reuses it rather than truncating it.

## Use VACUUM INTO when a compact copy is safer

`VACUUM INTO` creates a new compact database and leaves the source unchanged:

```sql
VACUUM INTO '/srv/staging/app-compacted.db';
```

The destination must not exist or must be empty. The command creates a consistent snapshot, but an interrupted output can be incomplete. Validate the new file, preserve the original, and use a controlled maintenance cutover if the compacted copy will replace it.

This approach also removes forensic remnants of deleted content from the destination. Treat that as a data-handling decision, not merely a performance operation.

## Configure incremental auto-vacuum early

Incremental auto-vacuum stores additional reverse-map information that lets SQLite move free pages to the end and truncate them in controlled steps. For a new database, enable it before creating tables:

```sql
PRAGMA auto_vacuum = INCREMENTAL;
PRAGMA auto_vacuum;
```

The query should return `2`. A brand-new database does not need `VACUUM` when the mode is set before any tables are created. For an existing database in `auto_vacuum=NONE`, however, setting the pragma alone is insufficient. Set `INCREMENTAL` and run one full `VACUUM` to rebuild the file with the required metadata. Changing this mode is a schema-maintenance event and should be backed up, staged, and versioned.

Afterward, reclaim a bounded number of freelist pages during low traffic:

```sql
PRAGMA incremental_vacuum(1000);
```

The pragma removes up to the requested number of freelist pages. It has no effect unless incremental auto-vacuum is enabled. Use small batches, measure lock time and write volume, and stop when free-space goals are met.

## Understand FULL auto-vacuum's tradeoff

`auto_vacuum=FULL` moves free pages to the end and truncates the file at every commit. It does not repack partially filled pages and can increase fragmentation. That makes it a poor automatic default for many write-heavy workloads.

Choose among modes based on behavior:

| Mode | File shrink behavior | Main tradeoff |
| --- | --- | --- |
| `NONE` | Reuses free pages; full `VACUUM` to shrink | File remains at high-water mark |
| `INCREMENTAL` | Application reclaims bounded page batches | Requires setup metadata and scheduling |
| `FULL` | Truncates freelist pages on each commit | Extra page movement and possible fragmentation |

## Separate space reclamation from query maintenance

A smaller file does not automatically make queries faster. Run `PRAGMA optimize` according to SQLite's guidance so planner statistics stay useful, and fix indexes based on query plans. Do not schedule full `VACUUM` as a reflexive daily task.

Alert on low free space before reclamation becomes an emergency. `VACUUM` is least safe when the disk is already nearly full. If emergency headroom is required, remove or move unrelated recoverable files first, then take a backup and perform database maintenance deliberately.

## Conclusion

Freelist pages are reusable database capacity, not automatically waste. Measure `page_count` and `freelist_count`, use full `VACUUM` only for a justified rebuild with enough temporary space, and choose incremental auto-vacuum when gradual filesystem reclamation matters. Back up first and verify structure, foreign keys, and application behavior afterward.

## Official Documentation

- [SQLite VACUUM](https://www.sqlite.org/lang_vacuum.html)
- [SQLite `auto_vacuum` pragma](https://www.sqlite.org/pragma.html#pragma_auto_vacuum)
- [SQLite `incremental_vacuum` pragma](https://www.sqlite.org/pragma.html#pragma_incremental_vacuum)
- [SQLite `freelist_count` pragma](https://www.sqlite.org/pragma.html#pragma_freelist_count)
