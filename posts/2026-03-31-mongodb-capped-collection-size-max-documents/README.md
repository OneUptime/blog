# How to Set Size and Max Document Limits for Capped Collections in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Capped Collection, Storage, Collection Management, Database Design

Description: Learn how the size and max parameters work together when creating MongoDB capped collections, and how to pick the right values for your use case.

---

MongoDB capped collections enforce a fixed storage ceiling. When that ceiling is reached, the oldest documents are overwritten automatically in a circular fashion. Two parameters control this ceiling: `size` (required) and `max` (optional).

## Creating a Capped Collection

```javascript
db.createCollection("audit_log", {
  capped: true,
  size: 104857600,   // 100 MB - required, in bytes
  max: 500000        // optional: maximum document count
})
```

## How size and max Interact

Both limits are enforced independently, but whichever is reached first triggers the removal of older documents.

- If `size` is reached before `max`, MongoDB removes old documents even if the count is below `max`.
- If `max` is reached before `size`, MongoDB removes old documents even if there is still free space.

In practice you should choose values so that both limits are roughly hit at the same time to avoid wasting allocated space.

```javascript
// Example: average document is ~200 bytes
// 500,000 docs x 200 bytes = ~100 MB - both limits align
db.createCollection("events", {
  capped: true,
  size: 104857600,
  max: 500000
})
```

## Minimum Size

MongoDB enforces a minimum `size` of 4096 bytes (4 KB). If you specify a smaller value it is rounded up:

```javascript
db.createCollection("tiny_log", {
  capped: true,
  size: 1024   // will be rounded up to 4096
})
```

## Inspecting a Capped Collection's Limits

```javascript
db.audit_log.options()
```

Output:

```json
{
  "capped": true,
  "size": 104857600,
  "max": 500000
}
```

## Checking Current Usage

```javascript
db.audit_log.stats()
```

Key fields:

```text
"count": 487312,          // current document count
"size": 97458234,         // current data size in bytes
"storageSize": 104857600  // total allocated storage
```

## Choosing the Right size Value

| Workload                | Documents/sec | Avg Doc Size | Suggested Retention | Recommended size |
|-------------------------|--------------|-------------|---------------------|-----------------|
| App access logs         | 1,000         | 300 B        | ~1 hour             | 1 GB            |
| IoT sensor readings     | 10,000        | 100 B        | ~10 min             | 600 MB          |
| Background job audit    | 10            | 2 KB         | ~1 week             | 12 GB           |

## Modifying Limits After Creation

Starting with MongoDB 6.0, you can modify capped collection limits using `collMod`:

```javascript
db.runCommand({
  collMod: "audit_log",
  cappedSize: 524288000,   // new 500 MB limit
  cappedMax: 1000000
})
```

On MongoDB versions before 6.0, you must drop and recreate the collection:

```javascript
db.audit_log.drop()
db.createCollection("audit_log", {
  capped: true,
  size: 524288000,   // new 500 MB limit
  max: 1000000
})
```

## Summary

MongoDB capped collections require a `size` in bytes and support an optional `max` document count. Both limits work independently - whichever is hit first triggers overwriting of oldest documents. Size up your capped collections by multiplying expected document count by average document size, then verify with `db.collection.stats()`.
