# Why KahaDB Journal Files Never Shrink: Finding the Queue or Subscriber Holding Them Open

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ActiveMQ, ActiveMQ Classic, KahaDB, Message Store, Disk Usage

Description: Explain KahaDB's segment cleanup model and use targeted trace logging to find the destination, acknowledgement, or transaction retaining old journal files.

---

KahaDB journal files do not shrink in place when a message is acknowledged. KahaDB appends records to fixed-size journal segments and later deletes an entire old segment only when nothing still needs any record in it. One long-lived reference can therefore retain a file containing mostly obsolete data.

That is normal log-structured storage behavior. Unbounded growth is not normal; it means references keep preventing whole-file cleanup or cleanup itself cannot run successfully.

## Why a journal segment remains in use

The ActiveMQ Classic KahaDB cleanup guide lists four reasons:

1. the file contains a pending message for a queue or durable topic subscription;
2. it contains an acknowledgement for a message in another in-use file, which recovery still needs;
3. it is referenced by a pending transaction;
4. it is the current journal file and may receive another write.

This creates a dependency chain. A newer acknowledgement can keep an older message file relevant, while a single very old pending message can retain a series of acknowledgement records.

Common operational owners are:

- an offline durable subscriber retaining topic messages;
- a queue with an old, unconsumed message;
- a shared or individual DLQ nobody drains;
- a slow or stuck consumer with a large backlog;
- an open transaction;
- expired messages not yet paged and processed;
- archived data logs, when archiving is intentionally enabled.

## Do not infer live data from directory size

The KahaDB directory can be much larger than the sum of current message bodies because it contains journal history, indexes, and recovery data. Likewise, a queue can be empty now while acknowledgement dependencies delay deletion until a later checkpoint and cleanup.

Before changing anything, record:

- filesystem bytes and free space;
- broker `StorePercentUsage`;
- KahaDB journal file count and age;
- queue sizes and oldest known backlog;
- inactive durable subscribers;
- DLQ sizes;
- pending or long-running transactions;
- recent checkpoint, cleanup, and I/O errors.

Check whether `archiveDataLogs` is enabled. If so, eligible segments are moved to an archive directory instead of deleted; disk usage will not fall unless archive retention is managed separately.

## Use KahaDB cleanup trace logging

The official diagnostic is targeted TRACE logging for:

```text
org.apache.activemq.store.kahadb.MessageDatabase
```

The cleanup trace begins with the set of candidate data-file IDs, then removes IDs still referenced by each destination and transaction. The point where candidate IDs disappear identifies what is retaining them.

The documented destination prefixes in this trace are:

- `0:<name>` for a queue;
- `1:<name>` for a topic.

Capture only a short diagnostic window. KahaDB TRACE logging is verbose and can itself consume disk and I/O. ActiveMQ Classic's Broker MBean exposes `reloadLog4jProperties`, allowing a temporary logging change to be applied without a restart when the deployed logging setup supports it.

A simplified reading looks like this:

```text
full candidates: [86, 87, 163]
after dest:0:ORDERS [86, 87]
after dest:1:EVENTS.DURABLE [87]
cleanup removing: [87]
```

Here the queue references file 163 and the topic/durable subscription references file 86. File 87 is unreferenced and eligible for removal.

## Investigate the retaining destination

### Queue or DLQ

Use JMX to inspect `QueueSize`, `InFlightCount`, consumer count, enqueue/dequeue rate, and expiry count. Browse a bounded sample to identify very old messages. Do not purge merely to reclaim disk; first decide whether the messages require processing, replay, export, or explicit disposal.

### Offline durable subscriber

Classic retains messages published to a durable topic subscription while it is offline. Confirm the subscriber identity and owner. Delete it only after establishing that the application has retired it or can tolerate losing its pending messages.

Classic can automatically remove durable subscribers using `offlineDurableSubscriberTimeout`, but its default is `-1`, meaning disabled. Automatic cleanup is a data-retention decision, not a disk-tuning shortcut.

### Pending transaction

Find the owning client and transaction boundary. A transaction that never commits or rolls back can retain store state. Fix client lifecycle and timeouts before forcing recovery.

### Expired messages

Expired messages may remain until the broker's periodic expiry scan pages and processes them. `expireMessagesPeriod` controls that scan per destination; `0` disables it. Increasing scan work trades broker I/O and CPU for faster expiry cleanup, so test changes on realistic backlogs.

## Give cleanup time to complete

After the reference is removed:

1. watch for a successful checkpoint and cleanup cycle;
2. confirm candidate files become unreferenced in trace logs;
3. verify file count and store usage decline;
4. turn TRACE logging off;
5. confirm producers and consumers remain healthy.

A broker restart can trigger recovery and later cleanup, but it does not remove a valid live reference. Repeated restarts without identifying the owner add risk without fixing retention.

## Never delete `data-*.log` manually

Manual removal breaks the journal's recovery graph and can cause message loss or an unrecoverable store. If disk pressure is urgent:

- stop or throttle producers;
- add filesystem capacity through a supported operational procedure;
- dispose of confirmed stale messages or subscriptions through broker management;
- take a consistent backup before invasive repair;
- follow the exact KahaDB recovery procedure for the deployed version.

Do not copy a live KahaDB directory and assume it is a transactionally consistent backup.

## Prevent a repeat

Alert on a combination of:

- store-percent utilization;
- journal growth rate;
- oldest unconsumed message age;
- queue and DLQ backlog;
- offline durable subscriber age;
- cleanup/checkpoint errors.

Disk size alone tells you that capacity is being consumed. The cleanup trace tells you which durable reference is responsible.

## Official Documentation

- [Why KahaDB log files remain after cleanup](https://activemq.apache.org/components/classic/documentation/why-do-kahadb-log-files-remain-after-cleanup)
- [ActiveMQ Classic KahaDB reference](https://activemq.apache.org/components/classic/documentation/kahadb)
- [Manage durable subscribers in ActiveMQ Classic](https://activemq.apache.org/components/classic/documentation/manage-durable-subscribers)
- [ActiveMQ Classic per-destination policies](https://activemq.apache.org/components/classic/documentation/per-destination-policies)
- [ActiveMQ Classic JMX reference](https://activemq.apache.org/components/classic/documentation/jmx)
