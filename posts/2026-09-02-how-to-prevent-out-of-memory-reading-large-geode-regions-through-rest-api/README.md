# How to Prevent Out-of-Memory Errors When Reading Large Geode Regions Through the REST API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, REST API, Memory Management, Performance, Troubleshooting

Description: Replace unbounded Geode REST reads with deterministic key batches or OQL keyset pages, then enforce heap guardrails and concurrency limits.

---

Apache Geode's Developer REST service runs as an embedded HTTP service in a Geode member. A request such as:

```http
GET /geode/v1/orders?limit=ALL
```

asks Geode to retrieve every region value and serialize the complete result to JSON. The server may simultaneously hold region data, a distributed query result, intermediate collections, PDX-to-JSON objects, and HTTP response buffers. The client then needs memory for the response body and its parsed representation. A large partitioned region can exhaust either process even if the region itself fits comfortably in heap or off-heap memory.

The primary fix is to bound the result. Increasing `-Xmx` or moving region values off heap does not make an unbounded JSON response safe.

## Understand the Region Read Endpoint

The region endpoint supports:

```http
GET /geode/v1/{region}?limit=N
GET /geode/v1/{region}?limit=ALL
GET /geode/v1/{region}/keys
GET /geode/v1/{region}/{key1},{key2},...,{keyN}
HEAD /geode/v1/{region}
```

When `limit` is omitted, Geode returns 50 values by default. The order is not guaranteed. Therefore this loop is **not** pagination:

```text
repeat GET /geode/v1/orders?limit=500
```

Each request may return the same or an overlapping arbitrary subset, and the endpoint provides no continuation token. A finite limit is a response cap, not a cursor.

`GET /orders/keys` returns all keys in one response. Keys are smaller than values, but for a very large region the key array can still be unbounded and exhaust memory. Do not fetch all keys merely to split them after they already reached one client buffer.

Use `HEAD` to estimate scope without a response body:

```bash
curl --head https://geode.example.net:7070/geode/v1/orders
```

The `Resource-Count` response header reports the region's entry count. Count alone is not a byte estimate; sample serialized response sizes as well.

## Use Bounded Multi-Key Reads When the Caller Knows the Keys

If the application already has order IDs, request a small batch directly:

```http
GET /geode/v1/orders/O-1001,O-1002,O-1003?ignoreMissingKey=true
```

Bound batches by both key count and estimated response bytes. A safe batch of 100 small values can still be unsafe when one value contains a multi-megabyte nested collection. Also respect proxy and server URI-length limits; hundreds of long, percent-encoded keys can exceed them before memory becomes the constraint.

Maintain the key worklist in a durable, bounded source such as the calling application's database, message stream, or previously produced manifest. Checkpoint after each successfully processed batch and make processing idempotent. This approach avoids the unbounded `/keys` endpoint entirely.

Geode's Developer REST interface restricts region keys to strings. Percent-encode reserved characters and do not use commas inside a key when relying on the comma-separated multi-key path unless the deployed endpoint's encoding behavior has been tested.

## Use OQL Keyset Pagination for an Ordered Scan

When a REST workflow genuinely needs to scan a region and keys have a stable total order, create a prepared OQL query whose predicate advances beyond the last processed key:

```sql
SELECT DISTINCT
  e.key AS orderKey,
  e.value AS orderValue
FROM /orders.entries e
WHERE e.key > $1
ORDER BY e.key
LIMIT 250
```

OQL supports `LIMIT`, and `ORDER BY` queries require `DISTINCT`. For a partitioned region, every field in `ORDER BY` must also appear in the projection; `orderKey` satisfies that rule here.

Register the prepared query once, URL-encoding the OQL parameter:

```http
POST /geode/v1/queries?id=ordersByKeyPage&q=<URL-encoded-OQL>
```

Execute it with the last key in the JSON request body:

```http
POST /geode/v1/queries/ordersByKeyPage
Content-Type: application/json

[
  {"@type":"string", "@value":"O-000000"}
]
```

After processing a page, use its greatest `orderKey` as the next parameter. Stop when fewer than 250 rows return. Never advance the checkpoint until the page has been durably processed.

Keyset pagination has no `OFFSET` cost and avoids retaining all prior keys. It still has consistency semantics to define:

- an entry inserted with a key behind the cursor after that cursor passed can be missed;
- updates can be seen at whichever version exists when their page is queried;
- deletes before their page produce no row; and
- retrying a page can return changed values.

For a repeatable export, quiesce writes before a REST scan or snapshot export, or scan a versioned immutable key range. Geode's snapshot export is a better bulk-transfer primitive, but it does not provide a consistency guarantee while updates are occurring.

If string lexicographic order does not match business order, introduce an immutable sortable key contract. Do not cast or invoke arbitrary methods in OQL simply to force an ordering; that adds query cost and security-authorizer surface.

## Project Only the Fields the Caller Needs

If the consumer needs three fields, do not return the entire nested value:

```sql
SELECT DISTINCT
  e.key AS orderKey,
  e.value.status AS status,
  e.value.updatedAt AS updatedAt
FROM /orders.entries e
WHERE e.key > $1
ORDER BY e.key
LIMIT 250
```

PDX lets the query engine access named fields without fully deserializing the domain object. A smaller projection reduces server result memory, JSON generation, network bytes, and client parsing memory.

Measure the real query plan and consider a matching index for selective predicates. An index can reduce scan CPU, but it does not reduce memory used by rows that are actually returned. A query that selects millions of matching objects remains dangerous even when the index finds them quickly.

## Use Snapshot Export for Bulk Data Movement

The REST API is convenient for application-sized reads, not the best bulk-export primitive. For a full region export, Geode provides snapshot APIs and `gfsh export data`:

```text
gfsh> export data \
  --region=orders \
  --parallel \
  --dir=/mnt/geode-exports/orders-2026-09-02 \
  --member=server-1
```

The parallel option writes a directory of snapshot files for a partitioned region. Snapshot export avoids building one giant JSON document and produces data in Geode's snapshot format for later import. In parallel mode, every hosting member writes its local data under the specified path on its own host; `--member` selects a member that hosts the region but does not make that host the only output location. Plan capacity, permissions, collection, and protection on every region host.

Use this workflow for backup-like transfer or migration. Use keyset pages when an HTTP consumer must transform a bounded stream of JSON records.

## Enable Heap Guardrails on REST-Hosting Members

Set equal initial and maximum heap sizes and a critical heap threshold when starting servers:

```text
gfsh> start server --name=server-1 \
  --initial-heap=8g \
  --max-heap=8g \
  --critical-heap-percentage=85
```

The critical threshold enables Geode's low-memory protection. When the member crosses it, OQL queries can be canceled with `QueryExecutionLowMemoryException`; index creation can be canceled with `InvalidIndexException`. The threshold is a circuit breaker, not capacity for large requests. Leave sufficient memory between normal peaks and the threshold for recovery and garbage collection.

Do not disable the low-memory query monitor. Also do not assume it bounds every stage of `GET /region?limit=ALL`; raw region retrieval, JSON serialization, web buffers, and client parsing still need bounded application requests.

Heap-based region eviction can protect entry storage only on regions configured for it. Off-heap values can reduce garbage-collector pressure, but keys, query result collections, PDX wrappers, and JSON responses still consume heap. Neither changes the number of returned rows.

## Limit Concurrent Expensive Requests

Even a safe 10 MB page can become unsafe when 100 callers request it simultaneously. Put a reverse proxy or application gateway in front of the REST service and enforce:

- authentication and least-privilege `DATA:READ` access;
- per-client and global concurrency limits;
- request rate limits;
- a maximum allowed `limit` value;
- rejection of `limit=ALL` for large or unapproved regions;
- URL and request-body size limits; and
- timeouts that cancel work rather than merely abandoning the client socket.

An edge timeout by itself can worsen the problem if Geode keeps computing after the proxy gives up and the client retries. Test cancellation behavior and use idempotent, checkpointed consumers with exponential backoff.

Separate interactive traffic from bulk scans operationally. A scheduled exporter should have a small concurrency budget and should pause when heap, GC, query latency, or region-operation latency crosses a defined limit.

## Bound Client Memory Too

Streaming the HTTP body from the socket does not guarantee streaming JSON parsing. Many client libraries buffer the full response before parsing, and some create multiple in-memory copies as bytes, text, syntax tree, and domain objects.

On the client:

- cap the accepted `Content-Length` when present;
- enforce a maximum bytes-read counter for chunked responses;
- use an incremental JSON parser;
- process and discard records instead of accumulating all pages;
- keep a bounded work queue behind the parser; and
- checkpoint only after downstream work completes.

Treat an unexpectedly huge single entry as an error with a dead-letter or separate large-object path. Page row count cannot protect against unbounded value size.

## Diagnose an Existing Out-of-Memory Failure

First identify which process failed:

- REST-hosting Geode member;
- another partitioned-region member gathering query results;
- reverse proxy; or
- client application.

Correlate request path and query text with member logs, GC logs, heap use, HTTP concurrency, and response bytes. Look for `OutOfMemoryError`, `QueryExecutionLowMemoryException`, long GC pauses, forced member disconnects, and repeated retries.

Capture a heap dump only under a controlled policy; it can contain region data and credentials. In the dump, distinguish retained region values from one enormous result collection or JSON buffer. If live region data dominates, resize or repartition the cache. If response objects dominate, reduce page rows, projection width, single-entry size, and concurrency.

Check basic service health independently:

```bash
curl --fail https://geode.example.net:7070/geode/v1/ping
```

A healthy ping while large reads fail points to workload shape rather than service startup.

## Load-Test the Worst Case

Choose limits from bytes and concurrency, not intuition. Test:

1. the largest expected entry and deepest nested collection;
2. a page containing the 99th-percentile entries;
3. the maximum permitted concurrent pages;
4. a partitioned region with production member count and network latency;
5. client retries after timeout;
6. low-memory query cancellation; and
7. a long scan while ordinary gets and puts continue.

Record server peak heap, post-GC retained heap, allocation rate, GC pause, query duration, response bytes, client peak memory, and business-operation latency. Keep enough margin that losing one server does not make the surviving members' page workload unsafe.

## Conclusion

Never treat `limit=ALL` as a bulk-transfer interface. Use known-key batches or deterministic OQL keyset pages, project only required fields, and use snapshot export for complete data movement. Heap thresholds, off-heap storage, and larger JVMs are secondary guardrails; bounded bytes, bounded concurrency, and checkpointed processing are what make large-region access safe.

## Official References

- [Developing Geode REST applications](https://geode.apache.org/docs/guide/latest/rest_apps/develop_rest_apps.html)
- [REST region endpoints](https://geode.apache.org/docs/guide/latest/rest_apps/rest_regions.html)
- [REST prerequisites and limitations](https://geode.apache.org/docs/guide/latest/rest_apps/rest_prereqs.html)
- [OQL SELECT, ORDER BY, and LIMIT](https://geode.apache.org/docs/guide/latest/developing/query_select/the_select_statement.html)
- [ORDER BY on partitioned regions](https://geode.apache.org/docs/guide/latest/developing/query_additional/order_by_on_partitioned_regions.html)
- [Query performance considerations](https://geode.apache.org/docs/guide/latest/developing/querying_basics/performance_considerations.html)
- [Monitoring low memory during queries](https://geode.apache.org/docs/guide/latest/developing/querying_basics/monitor_queries_for_low_memory.html)
- [Exporting cache and region snapshots](https://geode.apache.org/docs/guide/latest/managing/cache_snapshots/exporting_a_snapshot.html)
