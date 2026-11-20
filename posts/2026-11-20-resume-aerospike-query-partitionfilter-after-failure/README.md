# Resume an Aerospike Query with PartitionFilter After a Failure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Aerospike, Java, Database, Data Processing

Description: Resume Aerospike query work with a retained partition cursor, use the listener API for recovery, and checkpoint safely around durable downstream processing.

A long export has processed most of its records when a connection fails. Restarting from the beginning wastes work, but saving the last application key is not a reliable substitute for a query cursor. Aerospike queries progress through partitions, with ordering information that differs from user-key order.

Use `PartitionFilter` to retain that progress, and choose an API whose cursor tracks delivered records. Then decide how the cursor relates to durable work in your destination. Resuming database reads and guaranteeing exactly-once downstream processing are separate problems.

## Know what the cursor contains

The example targets **Aerospike Java client 10.5.0**, artifact `com.aerospike:aerospike-client-jdk8:10.5.0`. It uses a primary-index query over a set. Partitioned secondary-index queries require a compatible server; the pinned client documents support from server 6.0 onward.

`PartitionFilter.all()` starts with all 4,096 partitions. The object retains per-partition progress as the query runs. Reusing it continues from that state; constructing a new filter starts a new traversal. Aerospike's [PartitionFilter source](https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/query/PartitionFilter.java) documents its cursor role.

Do not replace a secondary-index cursor with `PartitionFilter.after(lastKey)`. That method only describes a position within one partition for a primary-index traversal; a secondary-index query needs more information than a record digest alone.

## Choose the listener path for recovery

Java offers both an iterator-returning query API and a listener-based API. They are not interchangeable for failure recovery.

With the synchronous `queryPartitions` iterator, the client can parse records into a queue and advance the recorded digest before your application retrieves those records. Stopping consumption and then resuming from that cursor can therefore skip work your application has not processed. The warning is explicit in the [cursor documentation](https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/query/PartitionFilter.java).

For terminate-and-resume behavior, the pinned client recommends `query(policy, statement, partitionFilter, listener)`. It runs callbacks during the call and retains completion state when the query terminates. See the [client method documentation](https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/AerospikeClient.java).

```mermaid
flowchart LR
    Q[Query page with retained cursor]
    C[Listener receives record]
    S[Durable idempotent sink]
    A[Callback returns]
    P[Client advances partition progress]
    K[Save checkpoint after call settles]
    Q --> C
    C --> S
    S --> A
    A --> P
    P --> K
    K --> Q
```

The sink is the destination that stores or processes the record. It must confirm durable acceptance before the callback returns if you intend the cursor to represent completed work.

## Keep one filter across page attempts

Save the following class as `ResumableSetRead.java` in a project with the pinned dependency. It accepts an already configured `AerospikeClient` and a durable record consumer. Replace `test` and `events` with your namespace and set.

```java
import com.aerospike.client.AerospikeClient;
import com.aerospike.client.Key;
import com.aerospike.client.Record;
import com.aerospike.client.policy.QueryPolicy;
import com.aerospike.client.query.PartitionFilter;
import com.aerospike.client.query.Statement;
import java.util.Objects;
import java.util.function.BiConsumer;

public final class ResumableSetRead {
    private final PartitionFilter cursor;
    private final Statement statement = new Statement();
    private final QueryPolicy policy = new QueryPolicy();

    public ResumableSetRead(PartitionFilter cursor) {
        this.cursor = Objects.requireNonNull(cursor);
        statement.setNamespace("test");
        statement.setSetName("events");
        statement.setMaxRecords(1000);
        policy.maxConcurrentNodes = 1;
        policy.maxRetries = 0;
        policy.socketTimeout = 2000;
        policy.totalTimeout = 10000;
    }

    public void readPage(AerospikeClient client,
                         BiConsumer<Key, Record> durableSink) {
        Objects.requireNonNull(durableSink);
        if (!cursor.isDone()) {
            client.query(policy, statement, cursor,
                (key, record) -> durableSink.accept(key, record));
        }
    }

    public boolean isDone() {
        return cursor.isDone();
    }
}
```

Create a cursor once with `PartitionFilter.all()`, pass it to the reader, and retain both while calling `readPage` until `isDone()` is true. The record limit bounds each page's intended work; do not assume every page contains exactly 1,000 records. Aerospike's [streaming query tutorial](https://aerospike.com/docs/develop/tutorials/queries/query-streams-java/) describes pagination and the completion check.

The timeouts and page size are staging examples. Internal retries are disabled here to make application-level recovery easier to observe. `maxConcurrentNodes=1` simplifies the consumer's concurrency requirements; increasing it requires a thread-safe sink. Do not call `readPage` concurrently on the same reader or cursor.

If the call throws, preserve the cursor rather than creating a new reader with a fresh filter. Classify the exception, apply a bounded delay where appropriate, and retry only while the overall job budget permits. Authentication, invalid query definitions, and permanent sink failures need correction, not an endless loop.

## Make the callback's success meaningful

The [listener command implementation](https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/query/QueryListenerCommand.java) calls the listener before updating the last processed position. Therefore, a callback that merely adds work to a volatile in-memory queue returns too early for a durable recovery guarantee.

Make the sink idempotent: processing the same record again should not repeat an unintended business effect. For an export, a stable destination identity based on job ID and record digest can support replacement or deduplication. For a notification or financial action, use a durable application-level operation identifier and an appropriate transaction design.

If the sink commits but the process fails before progress is checkpointed, that record may be delivered again after restart. Design for replay. Do not claim exactly-once processing merely because the database cursor can resume.

## Separate in-process resume from process restart

Keeping a Java object in memory handles a recoverable query failure only while the process survives. Crash recovery requires a durable checkpoint.

Store the cursor together with the query definition, namespace, set, filters, projection, client version, job identity, and checkpoint sequence. For secondary-index queries, preserve the complete partition status, including the index-value position; storing only digests is insufficient. The [PartitionStatus class](https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/query/PartitionStatus.java) shows the relevant cursor fields.

Persist only after the query call has settled and callbacks are no longer changing progress. Never serialize a cursor concurrently with an active page. Treat a checkpoint as versioned application state, and test restoration with the exact client version. The Java classes support serialization, but that is not a promise of compatibility across arbitrary upgrades or a reason to deserialize untrusted input.

Commit downstream work before publishing the corresponding checkpoint. A crash between those steps creates replay, which the idempotent sink handles. Reversing the order can create missing work: the checkpoint would claim progress that the destination never durably accepted.

## Keep the query definition stable

Resume with the same selection semantics. Changing the namespace, set, predicate, projected operations, or partition assignment while reusing an old cursor makes its meaning ambiguous. Start a new job when the definition changes.

A query cursor also does not freeze the source database. Records can be updated or removed while the job runs, and new records may fall before positions already passed. If the export requires a consistent business snapshot, design that guarantee separately. A checkpoint proves where traversal stopped, not that the source remained unchanged.

For parallel processing, assign disjoint partition ranges and maintain a separate cursor and checkpoint for each worker. Avoid allowing two workers to update the same cursor. Aerospike's [partition-splitting tutorial](https://aerospike.com/docs/develop/tutorials/queries/query-splits-java/) explains range-based work division.

## Rehearse the actual recovery boundaries

Use a staging dataset with known identifiers and a sink that records accepted job/record pairs. First verify a normal multi-page run. Then inject a temporary database connection failure, a sink failure before commit, and a process restart after a committed page.

Compare the final destination with the expected dataset. Count duplicate deliveries separately from duplicate effects: replay can be acceptable while repeated side effects are not. Verify that a failed or expired job remains visibly incomplete rather than being marked successful because one page returned no records.

Retain the checkpoint, query definition, client version, and recovery evidence together. A resumable query is ready when it preserves completed work, exposes incomplete work, and survives the failure boundaries your application actually needs to handle.
