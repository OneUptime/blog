# How to Test NFS and SMB Locking for an Embedded Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NFS, SMB, Network File System, Locking, Embedded Database

Description: Test cross-host lock exclusion, sync behavior, and recovery on disposable network storage before rejecting unsafe database placement.

---

An embedded database relies on filesystem locks and ordered, durable writes as part of its concurrency protocol. NFS and SMB implementations vary across servers, clients, mount options, operating systems, and failure conditions. A mount that passes a simple read and write test can still lose locks or acknowledge syncs incorrectly.

The safest default is to keep the database engine and its files on one host and expose an API over the network. Testing can disqualify a network filesystem, but a short successful test cannot prove every failure path safe.

## Reproduce the exact deployment path

Create a disposable share and database. Use the same:

- storage server and firmware;
- NFS or SMB protocol version and mount options;
- client kernels and operating systems;
- container runtime and volume driver;
- embedded database library build and VFS;
- failover, snapshot, antivirus, and backup agents.

Run clients on separate hosts. Two processes on one client may exercise only the local kernel's lock table and miss cross-host faults. Never run destructive lock or crash tests against a production share.

Record mount information before each test:

```bash
mount | grep '/mnt/db-lock-test'
stat -f /mnt/db-lock-test
```

Do not change caching, locking, oplock, or lease options based on folklore. Obtain supported settings from the filesystem and database vendors, then retest the complete combination.

## Run a cross-host exclusion test

SQLite's rollback journal mode has simpler network-filesystem requirements than WAL. WAL depends on shared memory and is not supported across hosts on a network filesystem.

On host A, create a disposable database and hold an exclusive transaction:

```bash
sqlite3 /mnt/db-lock-test/probe.db <<'SQL'
PRAGMA journal_mode = DELETE;
CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY, source TEXT NOT NULL);
BEGIN EXCLUSIVE;
INSERT INTO events(source) VALUES ('host-a');
.shell sleep 30
COMMIT;
SQL
```

While host A is sleeping, run this on host B:

```bash
sqlite3 /mnt/db-lock-test/probe.db \
  "PRAGMA busy_timeout=2000; INSERT INTO events(source) VALUES ('host-b');"
```

The host B write must not succeed while host A holds the exclusive transaction. It should wait and then report a busy or locked result. After host A commits, the same write should succeed. Verify the two rows and run:

```bash
sqlite3 /mnt/db-lock-test/probe.db "PRAGMA integrity_check;"
```

Any simultaneous success, I/O error, inconsistent view, missing row, or integrity failure is a rejection. Ensure the test truly overlapped by saving monotonic start and finish timestamps from both hosts.

## Stress lock transitions, not just one collision

Repeat thousands of short transactions from both hosts while a separate reader checks invariants. Include:

- `BEGIN IMMEDIATE`, commit, and rollback;
- process termination while a transaction is open;
- client reconnects and remounts;
- server restart and network interruption;
- file growth and low-free-space conditions;
- lock contention during backup and snapshot activity.

Give every intended insert a globally unique identifier and maintain an external append-only record of acknowledged operations. After each phase, compare accepted identifiers with database rows and run `integrity_check` plus `foreign_key_check`.

If the storage cluster fails over, run the suite before, during, and after failover. A lock service that works on the primary path may behave differently after role change.

## Test recovery and sync claims

SQLite's atomic commit depends on the VFS and filesystem honoring sync and write-order assumptions. Killing an application process tests journal recovery, but it does not test sudden storage power loss or a server falsely acknowledging durable writes.

Use a vendor-supported fault-injection environment to interrupt clients, network links, and storage nodes after acknowledged commits. On recovery, classify each transaction as present or absent according to the selected synchronous mode, and require a structurally valid database. Do not pull power from shared production hardware.

Capture packet loss, server logs, kernel messages, stale-file-handle errors, and lock-recovery events. A clean `integrity_check` after one test is only one observation.

## Detect configuration drift

A previously tested combination can change with a kernel update, NAS firmware release, protocol negotiation, mount option, or container storage driver. Pin or inventory these components and run the qualification suite after every change.

At application startup, log the resolved database path, filesystem type, journal mode, SQLite version, and VFS. Consider refusing a known network filesystem unless an explicit, audited override is present.

## Choose a safer architecture when in doubt

SQLite's own guidance recommends a client/server database when the data is separated from the application by a network. Alternatives are:

1. run PostgreSQL or another client/server engine next to its storage;
2. keep SQLite and all database access on one host, exposing an application service to remote clients;
3. if explicitly accepted and qualified, use rollback-journal mode with controlled access.

Do not place a cross-host SQLite database in WAL mode. Do not mix locking protocols or different SQLite builds that coordinate differently.

## Conclusion

Qualify network storage with cross-host exclusion, contention, recovery, failover, and durability tests on a disposable share. Treat any anomaly as a rejection, and retest after configuration changes. Passing tests reduces uncertainty but does not remove it; keeping the engine beside local storage and networking the API remains the robust design.

## Official Documentation

- [SQLite over a network](https://www.sqlite.org/useovernet.html)
- [SQLite write-ahead logging limitations](https://www.sqlite.org/wal.html)
- [SQLite locking and concurrency](https://www.sqlite.org/lockingv3.html)
- [SQLite causes of database corruption](https://www.sqlite.org/howtocorrupt.html)
