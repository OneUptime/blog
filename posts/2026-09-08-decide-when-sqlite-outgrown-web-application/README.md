# How to Decide When SQLite Has Outgrown a Production Web Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQLite, Database, Web Development, Capacity Planning, Production

Description: Decide from measured write contention, topology, availability, and operational needs when a web application should leave SQLite.

---

SQLite does not become unsuitable merely because a table has many rows or a website receives substantial traffic. It can serve production websites well when the application and database share a host, reads dominate, write transactions are brief, and one file fits the availability model.

The strongest migration signals are architectural: many simultaneous writers, multiple application hosts that need direct database access, or recovery and availability requirements that one local file cannot meet.

## Start with the actual constraint

Measure the database path separately from end-to-end request latency. Record:

- write transactions per second and their duration percentiles;
- time waiting for a writer and the rate of `SQLITE_BUSY` responses;
- read duration, rows scanned, and query plans;
- WAL size and checkpoint progress;
- database size, daily growth, backup duration, and restore duration;
- free disk space, I/O latency, and sync latency;
- queue depth and oldest-item age if writes are serialized.

A slow query with a missing index is not proof that the engine has been outgrown. Use `EXPLAIN QUERY PLAN`, add the right indexes, remove accidental full scans, and keep transactions free of network calls before comparing systems.

## Treat sustained writer contention as a hard signal

SQLite permits one writer per database file at an instant. WAL mode allows readers and a writer to overlap, but it does not add parallel writers. Short writes can queue efficiently; long or unpredictable transactions cannot.

Define an explicit write-wait objective. For example, decide how long a request may wait, what busy-error rate is acceptable, and how much queue backlog can be drained after a burst. Run a representative load test with the production number of processes and transaction shapes. If write waiting violates the objective after reasonable indexing, batching, and transaction shortening, a client/server database is the appropriate next step.

Do not mask a continuously growing queue with a longer busy timeout. That converts visible overload into high latency.

## Check whether the topology still matches SQLite

SQLite is an in-process database. It works best when the database file and the code issuing SQL reside on the same machine. A shared NFS or SMB path inserts the network into SQLite's file-I/O and locking channel. SQLite's documentation recommends a client/server database when data and application are separated by a network.

Migration is strongly indicated when:

- several application servers need to write the same dataset;
- autoscaled workers directly mount one database file;
- containers can be rescheduled onto different hosts while retaining one shared file;
- the team needs independent database credentials and network-level access control;
- deployment requires rolling schema changes across many writers.

A temporary alternative is one database-owning process on the storage host with a well-defined API. At that point, however, the team is operating a database service and should compare that burden with PostgreSQL.

## Evaluate availability and recovery requirements

A replicated volume does not automatically provide a valid SQLite failover mechanism. The new host must receive a consistent database state, including any live journal or WAL, and exactly one writer must own the file during transition.

Ask whether the application requires:

- automated failover with a small recovery-time objective;
- continuously shipped changes and a small recovery-point objective;
- point-in-time recovery;
- online backups without local disk pressure;
- read replicas or geographic distribution;
- online maintenance and schema changes;
- centralized auditing, roles, and connection termination.

SQLite can be backed up reliably, but these capabilities usually require application-specific orchestration. A managed or well-operated client/server database can make them first-class operational features.

## Do not migrate on file size alone

SQLite supports very large database files, but theoretical limits are not planning targets. The relevant limits are the filesystem, backup window, restore time, available temporary space for maintenance, cache behavior, and the time required to scan or rebuild the largest table.

A read-heavy local catalog can remain a good SQLite workload at a size that would be awkward for a write-heavy web database. Conversely, a small file with long concurrent writes may already need a different engine.

## Use a scored decision record

Review these dimensions with measured evidence:

| Dimension | SQLite remains a good fit | Migration pressure |
| --- | --- | --- |
| Writers | Brief writes can queue | Sustained concurrent write demand |
| Topology | One host owns local storage | Many hosts need direct access |
| Availability | Restart or restore meets SLO | Automated failover or PITR required |
| Operations | File backup and app-level metrics suffice | Central roles, audit, replicas, online operations |
| Data shape | One file is manageable | Growth breaks backup, restore, or maintenance window |

Set a review threshold before an incident. Crossing one serious topology or durability boundary can justify migration even when average latency still looks healthy.

## Preserve a migration runway

If pressure is rising, make data portable before cutover:

- eliminate ambiguous SQLite types and normalize timestamps;
- enable and validate foreign keys;
- remove dependencies on SQLite-only SQL where practical;
- introduce a repository boundary around database access;
- use stable externally generated identifiers;
- build repeatable row-count and checksum comparisons;
- load-test PostgreSQL with production transaction semantics.

Dual-database writes are difficult to make atomic. Prefer a planned snapshot, bulk load, change capture or a bounded write pause, then a verified cutover with a rollback deadline.

## Conclusion

SQLite is outgrown when its single-writer, same-host, single-file model conflicts with measured workload or service requirements. Fix query and transaction problems first, then decide from sustained write wait, multi-host topology, recovery objectives, and operational capabilities. Begin migration before those constraints become an outage.

## Official Documentation

- [SQLite appropriate uses](https://www.sqlite.org/whentouse.html)
- [SQLite over a network](https://www.sqlite.org/useovernet.html)
- [SQLite transaction behavior](https://www.sqlite.org/lang_transaction.html)
- [SQLite write-ahead logging](https://www.sqlite.org/wal.html)
