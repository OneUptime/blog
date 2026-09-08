# How to Survive Sudden Power Loss When SQLite Runs on SD Cards or Flash Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQLite, Power Loss, Flash Memory, Embedded Systems, Reliability

Description: Configure SQLite durability, qualify flash hardware, bound writes, and verify recovery under real power-cut tests.

---

SQLite's atomic-commit design can survive an interrupted transaction when the operating system, filesystem, and storage device honor locking, write-order, and sync guarantees. Cheap or failing flash controllers can violate those assumptions. Wear leveling may damage unrelated sectors during a power cut, and no database setting can repair hardware that acknowledges data before it is durable.

Reliable operation therefore combines conservative SQLite settings with qualified media, power design, backups, and device-level fault testing.

## Keep the database on a local filesystem

Place the database, journal or WAL, and temporary files on the same supported local filesystem. Do not put the file on NFS or SMB, remove or rename a hot journal, or let two SQLite builds use incompatible locking protocols.

Ensure the database directory is writable when required, has stable ownership, and is not manipulated by a cleanup agent. After a crash, leave the database and its sidecars under their original names and let SQLite open them normally to perform recovery.

## Select durability settings explicitly

For WAL mode, configure and verify:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = FULL;
```

In WAL mode, `synchronous=FULL` syncs the WAL at each commit and provides durability when the underlying stack behaves correctly. `synchronous=NORMAL` preserves consistency but a recently acknowledged transaction can be lost after power failure. Decide from the product's data-loss requirement, not from a benchmark alone.

For rollback-journal mode, use `synchronous=EXTRA` when the strongest documented durability around journal deletion is required:

```sql
PRAGMA journal_mode = DELETE;
PRAGMA synchronous = EXTRA;
```

Do not use `journal_mode=OFF` or `synchronous=OFF` for durable state. Set pragmas on every new connection where the setting is connection-local, query them back, and fail startup on an unexpected result.

## Use power-safe hardware

Choose industrial or high-endurance media sized with substantial spare capacity. Qualify the exact controller, card, board, kernel, and filesystem combination. A brand name or endurance rating does not prove correct flush semantics.

Where the device permits it, add a monitored UPS, supercapacitor, or hold-up circuit that gives the application and storage time to finish writes. The shutdown path should stop accepting work, commit or roll back active transactions, checkpoint when appropriate, close the database, sync the filesystem, and signal when power may be removed. A controlled shutdown helps, but recovery must still handle power loss before that sequence begins.

Replace media based on measured wear and error indicators before end of life. Keep database writes away from a nearly full filesystem, because SQLite may need journal, WAL, checkpoint, or temporary-file space to complete safely.

## Reduce avoidable flash writes safely

Batch related mutations into one short transaction so they share commit overhead:

```sql
BEGIN IMMEDIATE;
INSERT INTO samples(device_id, captured_at, value) VALUES (?, ?, ?);
INSERT INTO samples(device_id, captured_at, value) VALUES (?, ?, ?);
COMMIT;
```

Bound the batch by time and item count. Very large transactions increase recovery work, WAL growth, latency, and the amount of newly written data exposed to one interruption. Never hold a transaction open while waiting for network input.

Use appropriate indexes and retention policies so the application does not rewrite more data than necessary. Schedule full `VACUUM` operations only when their space benefit justifies a complete database rewrite. Monitor WAL checkpoint progress and prevent long readers from allowing it to grow without bound.

## Test actual power removal

`kill -9` is useful for testing application-crash recovery, but it does not remove power from caches or the flash controller. Build a disposable test fixture that can cut device power at randomized points while a workload:

1. writes transactions with unique sequence numbers;
2. waits for each commit result;
3. records acknowledgements on an independent durable system;
4. cycles power without an orderly shutdown;
5. reopens the database and runs validation.

After every cycle, run:

```sql
PRAGMA integrity_check;
PRAGMA foreign_key_check;
```

Classify missing commits according to the configured synchronous mode and compare domain invariants. Repeat across thousands of cuts, high and low temperatures, nearly full media, and the supported lifetime range. Any corruption disqualifies the hardware and software combination.

Do not power-cycle shared lab or production equipment without an approved safety setup.

## Make recovery routine

Create versioned, database-aware backups and regularly restore them onto replacement hardware. Keep enough generations to survive silent corruption discovered after it began. Record checksums and schema versions, and copy backups off the device so one controller failure cannot destroy both source and recovery copy.

On boot after an unclean shutdown, open SQLite normally, record recovery errors, run a fast health check, and keep the application read-only or unavailable if validation fails. Do not delete a journal or WAL merely to make startup continue.

## Conclusion

SQLite can survive sudden power loss only when every layer honors its durability contract. Use a local filesystem, `synchronous=FULL` with WAL or consider `EXTRA` with a rollback journal, qualified power-safe flash, adequate free space, bounded transactions, and off-device backups. Prove the complete device with real power-cut testing rather than assuming process-crash tests are equivalent.

## Official Documentation

- [SQLite atomic commit](https://www.sqlite.org/atomiccommit.html)
- [SQLite `synchronous` pragma](https://www.sqlite.org/pragma.html#pragma_synchronous)
- [SQLite causes of corruption](https://www.sqlite.org/howtocorrupt.html)
- [SQLite write-ahead logging](https://www.sqlite.org/wal.html)
