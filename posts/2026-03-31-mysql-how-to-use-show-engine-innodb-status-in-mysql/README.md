# How to Use SHOW ENGINE INNODB STATUS in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, InnoDB, Monitoring, Diagnostic, Performance

Description: Learn how to interpret all sections of SHOW ENGINE INNODB STATUS output in MySQL to diagnose performance issues, lock conflicts, and transaction problems.

---

## Overview

`SHOW ENGINE INNODB STATUS` is the primary diagnostic command for InnoDB internals. It provides a point-in-time snapshot of the InnoDB storage engine state, including transaction activity, lock waits, buffer pool usage, I/O statistics, and more.

```sql
SHOW ENGINE INNODB STATUS\G
```

The `\G` modifier formats output vertically, which is much easier to read than the default horizontal table format.

## Key Sections and What They Tell You

### BACKGROUND THREAD

```text
----------------
BACKGROUND THREAD
----------------
srv_master_thread loops: 100 srv_active, 0 srv_shutdown, 1201 srv_idle
srv_master_thread log flush and writes: 0
```

Shows the InnoDB master thread activity. High `srv_active` relative to `srv_idle` indicates the server is busy.

### SEMAPHORES

```text
----------
SEMAPHORES
----------
OS WAIT ARRAY INFO: reservation count 12345
RW-shared spins 0, rounds 0, OS waits 0
RW-excl spins 1234, rounds 5678, OS waits 900
```

High OS waits indicate thread contention. If you see many waits on specific mutexes (e.g., `btr0sea.ic` for AHI), it points to specific bottlenecks.

### LATEST DETECTED DEADLOCK

```text
------------------------
LATEST DETECTED DEADLOCK
------------------------
2024-05-10 14:32:11
*** (1) TRANSACTION: ...
```

Shows the most recent deadlock with full transaction and lock details. This section is only present if a deadlock has occurred since the last InnoDB restart.

### TRANSACTIONS

```text
------------
TRANSACTIONS
------------
Trx id counter 421999
Purge done for trx's n:o < 421950 undo n:o < 0 state: running but idle
History list length 45
LIST OF TRANSACTIONS FOR EACH SESSION:
---TRANSACTION 421998, ACTIVE 2 sec
...
```

- **History list length**: number of unpurged undo log records. Should stay below 10,000. High values mean a long-running transaction is blocking undo purge.
- **ACTIVE X sec**: how long each transaction has been running. Watch for old transactions.

### FILE I/O

```text
--------
FILE I/O
--------
I/O thread 0 state: waiting for completed aio requests (insert buffer thread)
I/O thread 1 state: waiting for completed aio requests (log thread)
...
Pending normal aio reads: [0, 0, 0, 0] , aio writes: [0, 0, 0, 0] ,
 ibuf aio reads:, log i/o's:
```

Shows async I/O thread states and pending I/O counts. High pending reads/writes indicate disk bottlenecks.

### BUFFER POOL AND MEMORY

```text
----------------------
BUFFER POOL AND MEMORY
----------------------
Total large memory allocated 137363456
Dictionary memory allocated 548935
Buffer pool size   8191
Free buffers       6732
Database pages     1459
Old database pages 519
Modified db pages  12
Pending reads      0
Pending writes: LRU 0, flush list 0, single page 0
Pages made young 1234, not young 456
0.00 youngs/s, 0.00 non-youngs/s
Pages read 98765, created 1234, written 5678
Buffer pool hit rate 1000 / 1000, young-making rate 0 / 1000 not 0 / 1000
```

Key metrics:
- **Buffer pool hit rate**: should be close to 1000/1000 (= 100%)
- **Modified db pages**: dirty pages waiting to be flushed
- **Free buffers**: pages available for use — if this reaches 0, InnoDB must evict pages

### LOG

```text
---
LOG
---
Log sequence number          12345678901
Log buffer assigned up to    12345678901
Log buffer completed up to   12345678901
Log written up to            12345678901
Log flushed up to            12345678901
Pages flushed up to          12345678901
Last checkpoint at           12345678800
```

The gap between `Log sequence number` and `Last checkpoint at` represents uncheckpointed redo log data — changes written to the redo log whose corresponding dirty pages have not yet been flushed to the tablespace files. A large gap means InnoDB has more recovery work to do if it crashes.

### ROW OPERATIONS

```text
--------------
ROW OPERATIONS
--------------
0 queries inside InnoDB, 0 queries in queue
0 read views open inside InnoDB
Main thread process no. 1234, id 140..., state: sleeping
Number of rows inserted 123456, updated 23456, deleted 3456, read 9876543
0.00 inserts/s, 0.00 updates/s, 0.00 deletes/s, 0.00 reads/s
```

Shows throughput rates for DML operations.

## Capturing Output to a Table

For analysis, capture the output:

```sql
SELECT * FROM performance_schema.global_status
WHERE VARIABLE_NAME IN (
  'Innodb_buffer_pool_read_requests',
  'Innodb_buffer_pool_reads',
  'Innodb_rows_read',
  'Innodb_rows_inserted'
);
```

The buffer pool hit rate can be calculated as `1 - (Innodb_buffer_pool_reads / Innodb_buffer_pool_read_requests)`.

Or use a shell script to log periodically:

```bash
#!/bin/bash
mysql -u root -p -e "SHOW ENGINE INNODB STATUS\G" >> /var/log/innodb_status.log
```

## Summary

`SHOW ENGINE INNODB STATUS` provides comprehensive insight into InnoDB internals. Focus on the TRANSACTIONS section for lock and history list issues, SEMAPHORES for contention, BUFFER POOL for memory efficiency, and LATEST DETECTED DEADLOCK for lock conflict analysis. Use this command as your first diagnostic step for InnoDB performance problems.
