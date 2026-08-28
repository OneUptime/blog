# How to Paginate an Entire Qdrant Collection Safely with the Scroll API

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Qdrant, Vector Database, Scroll API, Pagination, Data Migration

Description: Learn cursor-safe patterns for scanning every Qdrant point with the Scroll API, including retries, concurrent-write caveats, and read consistency.

---

Qdrant's Scroll API returns points page by page without requiring their IDs in advance. It is the right primitive for migrations, audits, batch processing, and filtered exports. Safe pagination depends on one rule: feed Qdrant's returned <code>next_page_offset</code> back unchanged.

Do not treat Scroll like search pagination. Search offsets operate over ranked results; Scroll's default order is point ID order and exposes a continuation token specifically for the next page.

## Prerequisites

Before a full scan:

- Confirm the collection name and whether vectors are actually needed.
- Decide whether writers can be paused. This determines whether the scan can represent a stable dataset.
- Create payload indexes for any fields in the Scroll filter.
- Make downstream writes idempotent by Qdrant point ID.
- Store the continuation token in durable state after each successfully processed page.
- For replicated collections, decide whether the additional load of a stronger read-consistency setting is justified.

The examples use:

~~~bash
export QDRANT_URL=http://localhost:6333
export COLLECTION_NAME=products
~~~

Add an <code>api-key</code> header for Qdrant Cloud.

## Request the First Page

Omit <code>offset</code> on the first request:

~~~bash
curl -X POST "$QDRANT_URL/collections/$COLLECTION_NAME/points/scroll" -H 'Content-Type: application/json' -d '{
    "limit": 256,
    "with_payload": true,
    "with_vector": false
  }'
~~~

The response has two important members:

~~~json
{
  "result": {
    "points": [
      {"id": 40, "payload": {"sku": "A-40"}},
      {"id": 41, "payload": {"sku": "A-41"}}
    ],
    "next_page_offset": 42
  },
  "status": "ok"
}
~~~

By default, Qdrant sorts Scroll results by ID. Treat <code>next_page_offset</code> as an opaque continuation cursor returned by Qdrant and pass it back unchanged. If the token is null, the last page has been reached.

## Request the Next Page

Echo the returned token in the body:

~~~bash
curl -X POST "$QDRANT_URL/collections/$COLLECTION_NAME/points/scroll" -H 'Content-Type: application/json' -d '{
    "offset": 42,
    "limit": 256,
    "with_payload": true,
    "with_vector": false
  }'
~~~

Point IDs may be unsigned integers or UUID strings. Treat the offset as an opaque value:

- Do not add one to a numeric offset.
- Do not manufacture the next UUID.
- Do not derive the cursor from the number of rows processed.
- Do not stop merely because a page contains fewer rows than <code>limit</code>.

Only a null <code>next_page_offset</code> is the documented end marker.

## Implement a Complete Python Loop

The Python client returns a tuple of records and the next offset:

~~~python
from qdrant_client import QdrantClient

client = QdrantClient(url="http://localhost:6333")

collection_name = "products"
cursor = None
processed = 0

while True:
    records, next_cursor = client.scroll(
        collection_name=collection_name,
        limit=256,
        offset=cursor,
        with_payload=True,
        with_vectors=False,
    )

    for record in records:
        # Replace with an idempotent upsert keyed by record.id.
        process(record)
        processed += 1

    # Persist next_cursor only after this page is durably processed.
    save_checkpoint(next_cursor, done=next_cursor is None)

    if next_cursor is None:
        break

    cursor = next_cursor

print(f"Processed {processed} point records")
~~~

On restart, load the saved token and pass it as <code>offset</code>. Unless destination writes and the checkpoint can be committed atomically, there is a checkpoint boundary:

- Saving before the destination commits can skip data after a crash.
- Saving after the destination commits can replay a page if the process crashes before the checkpoint.

When an atomic commit is unavailable, the safer pattern is the second one plus an idempotent destination. Upsert by point ID, or deduplicate by point ID and export job ID.

If an API call times out, retry the same cursor. Do not advance based on an uncertain response.

## Return Only the Data You Need

Vectors are often the largest part of a point. The REST option is singular <code>with_vector</code>, while the Python client parameter is plural <code>with_vectors</code>.

For a metadata export:

~~~python
records, next_cursor = client.scroll(
    collection_name="products",
    limit=512,
    offset=cursor,
    with_payload=["sku", "category", "updated_at"],
    with_vectors=False,
)
~~~

For a vector migration, request only the named vectors the destination needs:

~~~python
records, next_cursor = client.scroll(
    collection_name="products",
    limit=128,
    offset=cursor,
    with_payload=True,
    with_vectors=["dense"],
)
~~~

Smaller responses generally permit larger pages, but there is no universal best page size. Benchmark end-to-end throughput and watch request latency, memory, and downstream batch limits. Very large pages increase response size and make retries more expensive.

## Scroll a Filtered Subset

Pass the same filter on every page:

~~~python
from qdrant_client import models

export_filter = models.Filter(
    must=[
        models.FieldCondition(
            key="tenant_id",
            match=models.MatchValue(value="tenant-42"),
        )
    ]
)

records, next_cursor = client.scroll(
    collection_name="products",
    scroll_filter=export_filter,
    limit=256,
    offset=cursor,
    with_payload=True,
    with_vectors=False,
)
~~~

Create a keyword payload index on <code>tenant_id</code> before running this at scale. Changing the filter between pages invalidates the meaning of the saved cursor and can create gaps or unexpected inclusions.

## Understand Concurrent Writes

The Scroll documentation defines page ordering and continuation, but it does not document snapshot isolation across a sequence of requests. Each page is a separate read request. Therefore, do not claim that a multi-page scan is a point-in-time view while writes continue.

With the default ID ordering, a point inserted after the scan has passed its position may not appear in the remaining pages. A point inserted ahead of the cursor may appear. Payloads or vectors updated during the job can reflect a different moment from earlier pages, and deleted points may disappear before their page is read.

Choose an operational model explicitly:

1. **Quiesced scan:** Pause writers, run the scan, verify it, then resume. This is the simplest stable export.
2. **Application-defined batch:** Filter on an immutable batch or generation field and prevent inserts, updates, or deletes in that generation during the scan.
3. **Live, best-effort scan:** Allow writes, accept that the job is not a snapshot, make the destination idempotent, and reconcile changes afterward.
4. **Backup or recovery copy:** Use Qdrant snapshots or Qdrant Cloud backups instead of reconstructing a point-in-time backup with Scroll.

A collection snapshot contains the collection configuration, points, and payloads. In a distributed deployment, collection snapshots are node-specific, so follow Qdrant's distributed snapshot procedure rather than taking one arbitrary node snapshot.

## Read Consistency Is Not Snapshot Isolation

Scroll accepts the read <code>consistency</code> query parameter. Qdrant supports numeric values and the <code>all</code>, <code>majority</code>, and <code>quorum</code> strategies. The default is 1.

For example:

~~~bash
curl -X POST "$QDRANT_URL/collections/$COLLECTION_NAME/points/scroll?consistency=majority" -H 'Content-Type: application/json' -d '{
    "offset": 42,
    "limit": 256,
    "with_payload": true,
    "with_vector": false
  }'
~~~

Read consistency compares replicas for that request and costs extra work. It can reduce replica-level inconsistency, but it does not turn many Scroll requests into one transaction or freeze concurrent writes for the duration of the job.

## Verify Completeness

When writers are paused and the filter is fixed, take an exact count before scanning:

~~~bash
curl -X POST "$QDRANT_URL/collections/$COLLECTION_NAME/points/count" -H 'Content-Type: application/json' -d '{"exact": true}'
~~~

For a filtered export, send the identical filter to Count and Scroll. At completion verify:

- The number of unique point IDs written equals the exact baseline count.
- No destination record failed permanently.
- The final Scroll response returned a null continuation token.
- A sample of point IDs, payloads, and requested vectors matches the source.

A before-and-after count is only a diagnostic when writers remain active. Matching totals do not prove the same logical set was read if inserts and deletes occurred during the scan.

## Do Not Mix ID Pagination with Payload Ordering

Scroll can also order by a payload field, but that is a different mode. Qdrant requires a payload index supporting Range conditions on the ordered field, and its ordering controls must be handled deliberately. For a simple entire-collection export, omit <code>order_by</code> and use the documented ID cursor loop.

## Version and Limitations

- This guide targets the current Qdrant 1.19 Scroll API.
- The REST request uses <code>with_vector</code>; the Python method uses <code>with_vectors</code>.
- Scroll is page-oriented retrieval, not similarity search and not a documented snapshot transaction.
- Read affinity introduced in 1.19 can keep repeated reads routed consistently, but it still does not freeze collection state.
- Collection aliases are not included in collection-level snapshots and must be handled separately during recovery or migration.

## Official Documentation

- [Scroll points API reference](https://api.qdrant.tech/api-reference/points/scroll-points)
- [Qdrant points and Scroll behavior](https://qdrant.tech/documentation/manage-data/points/)
- [Qdrant consistency guarantees](https://qdrant.tech/documentation/scaling/consistency-guarantees/)
- [Qdrant snapshots](https://qdrant.tech/documentation/operations/snapshots/)
- [Count points API reference](https://api.qdrant.tech/api-reference/points/count-points)
- [Qdrant payload indexing](https://qdrant.tech/documentation/manage-data/indexing/)

## Conclusion

Safe Scroll pagination is cursor-driven: start without an offset, process a page durably, checkpoint the exact returned token, and stop only when that token is null. Keep the consumer idempotent, request only needed fields, and never confuse per-request read consistency with a point-in-time scan. If the export must be stable, quiesce writers or use Qdrant's snapshot and backup mechanisms.
