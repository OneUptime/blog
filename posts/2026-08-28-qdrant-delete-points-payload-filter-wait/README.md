# How to Delete Qdrant Points by Payload Filter and Wait for the Update to Finish

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Qdrant, Vector Database, Data Management, Filtering, Python

Description: Learn how to preview and delete Qdrant points by payload filter, wait for completion, verify the result, and prepare recovery.

---

Qdrant can delete whole points selected by a payload filter. This is useful for retention policies, tenant offboarding, failed-ingestion cleanup, and removing a document split across many point IDs. It is also destructive: the selected points, their payloads, and their vectors stop being retrievable.

A safe workflow has four stages: back up, preview the exact filter, submit the delete with <code>wait=true</code>, and verify the same filter returns zero points.

## Prerequisites and Safety Checks

Before deleting:

- Confirm the collection, tenant, environment, and filter values.
- Add payload indexes for the fields used by the selector.
- Create and retain a tested snapshot or Qdrant Cloud backup.
- Pause or coordinate writers if the target set must not change between preview and deletion.
- Use an API credential with collection write access.
- Try the procedure against a staging collection or restored snapshot first.

The examples remove expired records for one tenant:

~~~bash
export QDRANT_URL=http://localhost:6333
export COLLECTION_NAME=documents
~~~

The filter requires all three facts:

- <code>tenant_id</code> equals <code>tenant-42</code>.
- <code>lifecycle</code> equals <code>expired</code>.
- <code>expires_at</code> is before 2026-08-01 UTC.

Using several independent conditions makes an accidental broad delete less likely than selecting on a single generic flag.

## Create a Recovery Point

For a self-hosted collection, request a collection snapshot and save its returned name:

~~~bash
curl -X POST "$QDRANT_URL/collections/$COLLECTION_NAME/snapshots?wait=true"
~~~

The snapshot API returns its name, size, creation time, and checksum. Download or copy it according to your deployment's backup policy. A collection snapshot contains that collection's configuration, points, and payloads, but collection aliases are not included. In a distributed deployment, follow Qdrant's per-node snapshot procedure. Qdrant Cloud users should evaluate Cloud backups for full-cluster recovery.

There is no undelete switch for an arbitrary point deletion. Recovery means restoring from a snapshot or backup, or re-upserting the deleted points from an authoritative source.

## Preview the Exact Count

Use the Count API with <code>exact=true</code>:

~~~bash
curl -X POST "$QDRANT_URL/collections/$COLLECTION_NAME/points/count" -H 'Content-Type: application/json' -d '{
    "filter": {
      "must": [
        {"key": "tenant_id", "match": {"value": "tenant-42"}},
        {"key": "lifecycle", "match": {"value": "expired"}},
        {"key": "expires_at", "range": {"lt": "2026-08-01T00:00:00Z"}}
      ]
    },
    "exact": true
  }'
~~~

Require an explicit expected range in automation. For example, abort if the count is zero when work was expected, or if it exceeds a reviewed maximum.

Then inspect a sample with the identical filter:

~~~bash
curl -X POST "$QDRANT_URL/collections/$COLLECTION_NAME/points/scroll" -H 'Content-Type: application/json' -d '{
    "filter": {
      "must": [
        {"key": "tenant_id", "match": {"value": "tenant-42"}},
        {"key": "lifecycle", "match": {"value": "expired"}},
        {"key": "expires_at", "range": {"lt": "2026-08-01T00:00:00Z"}}
      ]
    },
    "limit": 20,
    "with_payload": true,
    "with_vector": false
  }'
~~~

Review IDs and payloads, not just the count. Keep the filter body in one source of truth so the preview and delete cannot drift.

## Delete by Filter and Wait

Submit the selector to the point-delete endpoint:

~~~bash
curl -X POST "$QDRANT_URL/collections/$COLLECTION_NAME/points/delete?wait=true" -H 'Content-Type: application/json' -d '{
    "filter": {
      "must": [
        {"key": "tenant_id", "match": {"value": "tenant-42"}},
        {"key": "lifecycle", "match": {"value": "expired"}},
        {"key": "expires_at", "range": {"lt": "2026-08-01T00:00:00Z"}}
      ]
    }
  }'
~~~

A completed response has two status fields:

~~~json
{
  "result": {
    "operation_id": 17,
    "status": "completed"
  },
  "status": "ok"
}
~~~

The outer <code>status = ok</code> describes the request envelope. The important update state is <code>result.status = completed</code>.

Without <code>wait=true</code>, the usual successful state is <code>acknowledged</code>. That means Qdrant accepted the operation into its update pipeline; it does not mean the deletion is already visible to retrieval, and the official documentation notes that an acknowledged asynchronous operation can eventually fail. For a maintenance workflow that immediately verifies the result, request and require <code>completed</code>.

## Python End-to-End Example

~~~python
from qdrant_client import QdrantClient, models

client = QdrantClient(url="http://localhost:6333")
collection_name = "documents"

delete_filter = models.Filter(
    must=[
        models.FieldCondition(
            key="tenant_id",
            match=models.MatchValue(value="tenant-42"),
        ),
        models.FieldCondition(
            key="lifecycle",
            match=models.MatchValue(value="expired"),
        ),
        models.FieldCondition(
            key="expires_at",
            range=models.DatetimeRange(
                lt="2026-08-01T00:00:00Z",
            ),
        ),
    ]
)

before = client.count(
    collection_name=collection_name,
    count_filter=delete_filter,
    exact=True,
).count

if not 1 <= before <= 50_000:
    raise RuntimeError(f"Refusing unexpected delete count: {before}")

sample, _ = client.scroll(
    collection_name=collection_name,
    scroll_filter=delete_filter,
    limit=20,
    with_payload=True,
    with_vectors=False,
)
print("Sample IDs:", [point.id for point in sample])

result = client.delete(
    collection_name=collection_name,
    points_selector=models.FilterSelector(filter=delete_filter),
    wait=True,
)

if result.status != models.UpdateStatus.COMPLETED:
    raise RuntimeError(f"Delete did not complete: {result.status}")

remaining = client.count(
    collection_name=collection_name,
    count_filter=delete_filter,
    exact=True,
).count

if remaining != 0:
    raise RuntimeError(f"{remaining} matching points remain")

print(f"Pre-delete count was {before}; no matching points remain")
~~~

Use a timezone-qualified RFC 3339 datetime string. The <code>expires_at</code> field needs a datetime payload index for efficient Range evaluation; <code>tenant_id</code> and <code>lifecycle</code> need keyword indexes.

## Verify with the Same Selector

After a completed update:

1. Run exact Count with the same filter and require zero.
2. Run a small Scroll with the same filter and require no points.
3. Retrieve a few previously sampled IDs if you need direct evidence that whole points are gone.
4. Confirm unrelated control IDs are still retrievable.
5. Record the filter, exact pre-count, operation ID, result status, and snapshot identifier in the change log.

Do not use collection information's <code>points_count</code> as deletion proof. Qdrant documents collection-level point and indexed-vector counts as approximate; optimizations can temporarily retain changed or deleted internal records. The exact Count API represents queryable logical points.

## Concurrency and Retry Semantics

The preview and delete are two requests, not one atomic dry-run transaction. If points are inserted or their payload changes between them, the set deleted by the filter can differ from the previewed set.

For a fixed target set:

- Pause the relevant writers, or fence them with application-level maintenance state.
- Record the candidate IDs during preview.
- If necessary, delete reviewed IDs in bounded batches rather than repeatedly evaluating a broad live filter.

Be especially careful retrying a filtered delete after a timeout. Deleting already deleted points is harmless, but a newly written point that now matches the same filter could be caught by the retry. If the request outcome is uncertain and writers are active, re-count and review the current target set before retrying.

Qdrant's optional <code>ordering</code> parameter is separate from <code>wait</code>:

- <code>weak</code> is the default and adds no ordering guarantee.
- <code>medium</code> serializes writes through a dynamically selected leader.
- <code>strong</code> serializes through a permanent leader but can reduce availability if that leader is unavailable.

Use the same stronger <code>ordering</code> value for all relevant concurrent write operations on the same points when required, but do not mistake it for an atomic preview-plus-delete transaction. Read consistency on verification requests is another separate control for comparing replicas.

For example, a replicated deployment can request stronger write ordering explicitly:

~~~bash
curl -X POST "$QDRANT_URL/collections/$COLLECTION_NAME/points/delete?wait=true&ordering=strong" -H 'Content-Type: application/json' -d '{"filter": {"must": [{"key": "deletion_batch", "match": {"value": "batch-2026-08-28"}}]}}'
~~~

Choose that availability tradeoff deliberately rather than copying it into every delete.

## Performance and Strict Mode

Filtered deletion must find matching points. Index every field that materially narrows the target:

~~~bash
curl -X PUT "$QDRANT_URL/collections/$COLLECTION_NAME/index?wait=true" -H 'Content-Type: application/json' -d '{"field_name": "tenant_id", "field_schema": "keyword"}'

curl -X PUT "$QDRANT_URL/collections/$COLLECTION_NAME/index?wait=true" -H 'Content-Type: application/json' -d '{"field_name": "lifecycle", "field_schema": "keyword"}'

curl -X PUT "$QDRANT_URL/collections/$COLLECTION_NAME/index?wait=true" -H 'Content-Type: application/json' -d '{"field_name": "expires_at", "field_schema": "datetime"}'
~~~

Strict mode can set <code>unindexed_filtering_update</code> to false and reject filtered updates such as delete-by-payload on an unindexed field. That is useful protection against an accidental full payload scan.

Deleting a large logical set can also trigger later optimizer work. A completed delete means the update is applied and visible; it does not promise that storage compaction has already reclaimed every byte.

## Recovery Caveats

Restoring a collection snapshot can also discard legitimate changes made after that snapshot. Practice recovery into a separate collection when possible, compare it, and use an alias cutover only after validation. Snapshot compatibility is version-scoped: current Qdrant documentation supports restore to the same minor line or the next minor line, subject to its detailed version rules.

If your authoritative records live elsewhere, replaying only the deleted points can be safer than rolling the entire collection back.

## Official Documentation

- [Delete points API reference](https://api.qdrant.tech/api-reference/points/delete-points)
- [Qdrant point deletion and awaiting update results](https://qdrant.tech/documentation/manage-data/points/)
- [Count points API reference](https://api.qdrant.tech/api-reference/points/count-points)
- [Qdrant filtering](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant payload indexing](https://qdrant.tech/documentation/manage-data/indexing/)
- [Qdrant consistency guarantees](https://qdrant.tech/documentation/scaling/consistency-guarantees/)
- [Qdrant snapshots](https://qdrant.tech/documentation/operations/snapshots/)
- [Create collection snapshot API reference](https://api.qdrant.tech/api-reference/snapshots/create-snapshot)

## Conclusion

Treat delete-by-filter as a reviewed data change, not a convenience call. Back up first, reuse one exact selector for Count, Scroll, delete, and verification, pass <code>wait=true</code>, and require the inner update state to be <code>completed</code>. Coordinate concurrent writers and retries explicitly, because waiting for one delete to finish does not make the earlier preview atomic with it.
