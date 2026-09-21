# How to Propagate Data Deletion Across Replicas, Search Indexes, Queues, and Backups

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Data Deletion, Data Residency, Data Retention, Amazon S3, Data Consistency

Description: Use a durable deletion ledger, idempotent per-system work, and restore-time suppression to stop deleted customer data from reappearing in derived systems.

---

Deleting a customer row is only the beginning when copies exist in search indexes, caches, object replicas, queues, and backups. The hard failure is resurrection: an old event or restored backup recreates data that the application already reported as deleted.

Build deletion as a durable workflow with a record of its scope, progress, exceptions, and verification. Keep that workflow inside the approved data boundary too.

## Establish a deletion identity

Assign each request a unique deletion ID and an opaque subject reference scoped to the tenant. Avoid putting emails or names into deletion messages. The reference may still be sensitive, so apply the same regional and retention controls as other operational metadata.

In one source transaction where possible, record the deletion intent, prevent new use of the subject, and enqueue work through a durable outbox. A crash between deleting a row and publishing a message should not lose the downstream deletion request.

An illustrative event contract is:

```json
{
  "deletion_id": "del-20260921-0042",
  "tenant_ref": "tenant-017",
  "subject_ref": "subject-932",
  "generation": 7,
  "requested_at": "2026-09-21T08:00:00Z",
  "scope": ["profile", "search", "objects", "derived_events"]
}
```

The generation is an application-defined version used to reject stale updates. Define its ordering and authority centrally; a timestamp from an arbitrary producer is not a reliable substitute.

## Track each destination independently

Create work items for the authoritative database, read models, search indexes, caches, object stores, analytics tables, exports, and third-party processors. Record completion and verification separately.

A worker should be safe to run repeatedly. "Already absent" normally counts as a successful deletion, but permission failures and timeouts do not. Use a stable idempotency key such as the pair of deletion ID and destination.

This matters with queues such as standard SQS, which provides [at-least-once delivery](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues-at-least-once-delivery.html). Acknowledging a message should follow a durable work-state update. Retrying a partially completed workflow must not recreate the deleted subject.

## Make late events respect the deletion

Every consumer that can recreate data needs a deletion check or an equivalent ordered tombstone mechanism. Test an old "customer updated" event arriving after deletion, a replay from an archive, and an update already in flight when deletion starts.

For strict suppression, coordinate the tombstone check and target write atomically where possible. Otherwise, use conditional versions and a reconciliation pass to close the race. Checking a remote ledger and then writing without concurrency control leaves a gap.

Keep tombstones for at least the longest replay or restore horizon that can reintroduce the subject, subject to the approved retention policy. The ledger itself is not an excuse to retain unnecessary personal information indefinitely.

## Treat object versions and replicas explicitly

In S3, a delete marker does not erase older object versions. Delete-marker replication also has its own configuration and limitations, documented in [replicating delete markers](https://docs.aws.amazon.com/AmazonS3/latest/userguide/delete-marker-replication.html).

More importantly, a deletion that specifies an object version ID is not replicated as a version deletion to destination buckets. AWS explains this in [what S3 replicates](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-what-is-isnot-replicated.html). Inventory and process each destination's relevant versions; do not assume one source delete performs all required erasure.

Legal holds and immutable retention can prevent immediate removal. [S3 Object Lock](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html) documents those controls. Record affected artifacts and the permitted expiry procedure rather than marking them physically erased.

## Keep backups from resurrecting data

Define how deletion interacts with backup retention. Depending on the system and approved policy, a retained backup may be inaccessible for routine use until expiry rather than selectively rewritten.

Restore into quarantine. Before exposing the restored service or starting downstream consumers, replay deletion intents newer than the backup's recovery point and apply the current suppression ledger. Rebuild search indexes and caches only after this reconciliation.

Protect the deletion ledger independently so restoring an old application database cannot also roll back all knowledge of later deletions. Test restoring a backup containing a synthetic subject that was subsequently deleted.

## Report truthful completion states

Use states such as requested, live-data removal complete, downstream verification complete, and retained-backup expiry pending. Avoid a single "deleted" boolean when the actual state spans systems and retention periods.

Verification should include an authoritative lookup, replica lag checks, search queries, cache reads, object-version inventory, and an attempted stale-event replay. A search query returning no hits is not proof that every underlying segment or snapshot has been physically erased.

Publish only the completion state supported by the evidence. Keep failed destinations visible, retry them with bounded backoff, and escalate work that misses its objective. Deletion is complete only according to the explicitly defined scope and retention semantics, with replay and restore paths unable to make the subject active again.
