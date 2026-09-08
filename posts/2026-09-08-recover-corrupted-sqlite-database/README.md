# How to Recover a Corrupted SQLite Database and Verify the Restore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQLite, Corruption, Recovery, Data Integrity, Disaster Recovery

Description: Preserve evidence, assess SQLite corruption, salvage into a new database, and verify data before returning it to service.

---

SQLite recovery is a salvage operation, not a repair guarantee. The safest recovery source is a recent, tested backup. When no usable backup exists, `.recover` can reconstruct as much as possible from damaged pages, but recovered rows may be missing, duplicated, stale, or detached from their original table.

## Stop writes and preserve the original state

First stop every process that can open the database. Copy the main file and any `-wal` or `-journal` file together without renaming or deleting sidecars. Preserve filesystem metadata and calculate checksums. Perform all experiments on a duplicate.

```bash
set -euo pipefail

work_dir="recovery-work"
if [ -e "$work_dir" ]; then
  echo "Refusing to reuse $work_dir" >&2
  exit 1
fi

mkdir -- "$work_dir"
cp -p incident/app.db "$work_dir/"
for sidecar in incident/app.db-wal incident/app.db-shm incident/app.db-journal; do
  if [ -e "$sidecar" ]; then
    cp -p "$sidecar" "$work_dir/"
  fi
done
shasum -a 256 "$work_dir"/*
```

The example tolerates absent sidecars without suppressing a real copy failure, but it must run only after access is quiesced. A WAL or hot rollback journal may contain committed data or information required for automatic recovery. Open the copied database normally and close it cleanly so SQLite can apply valid recovery state. Let SQLite manage sidecar cleanup; if opening or recovery fails, keep the copied database and its sidecars together.

Record the application version, SQLite version, storage errors, shutdown symptoms, and the exact commands used. Keep the original read-only for forensic or vendor analysis.

## Measure the damage

On the working copy, ask SQLite to perform its full structural check:

```bash
sqlite3 recovery-work/app.db "PRAGMA integrity_check;"
```

The only clean result is one row containing `ok`. `integrity_check` detects malformed records, missing or multiply used pages, freelist problems, index inconsistencies, and several constraint errors. It does not report foreign-key violations, so run this separately if the database opens:

```bash
sqlite3 recovery-work/app.db "PRAGMA foreign_key_check;"
```

For routine monitoring, `quick_check` is faster. During an incident, use the full check and save its output. If normal queries and `.dump` work, a logical export from readable tables may preserve intent more accurately than a salvage scan.

## Recover into a brand-new database

Never pipe recovery output back into the damaged file. Generate SQL, inspect and archive it, then import it into a new path:

```bash
set -euo pipefail

if [ -e recovery-work/recovered.db ]; then
  echo "Refusing to overwrite recovery-work/recovered.db" >&2
  exit 1
fi

sqlite3 recovery-work/app.db ".recover --ignore-freelist" > recovery-work/recovered.sql
sqlite3 recovery-work/recovered.db < recovery-work/recovered.sql
```

By default, `.recover` also scans freelist pages, which can resurrect previously deleted information. `--ignore-freelist` reduces that risk but may omit data that can only be found there. Make the privacy and recovery tradeoff explicit. If unassigned fragments matter, choose a named holding table:

```bash
sqlite3 recovery-work/app.db ".recover --lost-and-found salvage_fragments" \
  > recovery-work/recovered-with-fragments.sql
```

The lost-and-found table requires human interpretation. Do not expose it to the application or copy its rows automatically into production tables.

## Validate structure and meaning

Run checks against the newly built database, not merely against the source:

```bash
sqlite3 recovery-work/recovered.db "PRAGMA integrity_check;"
sqlite3 recovery-work/recovered.db "PRAGMA foreign_key_check;"
```

Then compare the recovered schema with a known-good migration definition. Check for missing indexes, triggers, views, generated columns, and application metadata. Recovery can produce a structurally valid database that is semantically wrong.

Define application invariants before the incident. Examples include:

- every invoice references an account;
- the next generated identifier exceeds existing keys where the application requires monotonically increasing identifiers;
- ledger debits and credits balance;
- event timestamps fall within plausible ranges;
- each tenant has exactly one settings row;
- row counts and important totals agree with independent systems.

Quarantine rows that fail a rule. Reconcile critical data against logs, exports, payment processors, object storage, or downstream replicas. Document every accepted loss or reconstruction.

## Restore through the normal release process

Place the recovered database in an isolated staging environment and start the exact application version that owns its schema. Exercise startup migrations, representative reads, writes, uniqueness failures, foreign-key failures, and a clean restart. Take a fresh database-aware backup of the validated artifact before cutover.

For production replacement, stop all database access and close every connection, including readers. Archive the damaged database and its sidecars together, and ensure no old sidecars remain at the destination. Install a standalone database produced by the database-aware backup with correct ownership and permissions, and use an atomic rename within the same filesystem where possible. Keep a rollback plan. Monitor SQLite result codes, row-level invariants, and storage errors after service resumes.

## Fix the cause, not only the file

Common corruption causes include deleting or moving a hot journal or WAL, broken locking on network filesystems, multiple SQLite library copies using incompatible locks, storage that lies about sync completion, flash-controller failures, and unrelated code writing into the file. Preserve logs and test the suspected failure mode on disposable media.

## Conclusion

Freeze access, preserve the database and sidecars, and prefer a verified backup. Use `integrity_check` to assess structural damage and `.recover` only to salvage into a new file. A clean pragma result is necessary but not sufficient: reconcile business invariants, stage the matching application, and make a fresh tested backup before cutover.

## Official Documentation

- [SQLite recovery documentation](https://www.sqlite.org/recovery.html)
- [SQLite `integrity_check` and `quick_check` pragmas](https://www.sqlite.org/pragma.html#pragma_integrity_check)
- [SQLite causes of database corruption](https://www.sqlite.org/howtocorrupt.html)
- [SQLite write-ahead logging](https://www.sqlite.org/wal.html)
