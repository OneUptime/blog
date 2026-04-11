# How to Use JSON Documents with MySQL X DevAPI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, JSON, X DevAPI, Document, Collection

Description: Learn how to store, query, update, and index JSON documents in MySQL using the X DevAPI for flexible schema-free data management.

---

## Overview

The MySQL X DevAPI combines the flexibility of JSON document storage with the reliability of InnoDB. JSON documents are stored in collections (InnoDB tables with a `doc` JSON column) and queried using a path-based expression language. This makes MySQL suitable for workloads that need schema-free storage without giving up transactions, replication, or SQL access.

## Setup

```bash
npm install @mysql/xdevapi
```

```javascript
const mysqlx = require('@mysql/xdevapi');

const session = await mysqlx.getSession({
  host: '127.0.0.1',
  port: 33060,
  user: 'root',
  password: 'secret',
  schema: 'mydb'
});

const schema = session.getDefaultSchema();
const events = await schema.createCollection('events', { reuseExistingObject: true });
```

## Storing JSON Documents

```javascript
await events.add([
  {
    type: 'purchase',
    userId: 101,
    amount: 49.99,
    metadata: { source: 'web', browser: 'Chrome' },
    tags: ['sale', 'clothing'],
    timestamp: new Date().toISOString()
  },
  {
    type: 'login',
    userId: 202,
    metadata: { source: 'mobile', os: 'iOS' },
    tags: [],
    timestamp: new Date().toISOString()
  }
]).execute();
```

## Querying by JSON Field Value

```javascript
// Find purchase events
const result = await events.find('type = :t')
  .bind('t', 'purchase')
  .execute();

result.fetchAll().forEach(doc => console.log(doc));
```

## Querying Nested Fields

Use dot notation to access nested JSON paths:

```javascript
// Find events from mobile sources
const result = await events.find('metadata.source = :src')
  .bind('src', 'mobile')
  .fields(['userId', 'type', 'metadata.os'])
  .execute();
```

## Querying Arrays Inside Documents

Use the `IN` operator to search within JSON arrays:

```javascript
// Find documents where tags contain 'sale'
const result = await events.find("'sale' IN tags").execute();
```

## Updating Nested JSON Fields

```javascript
// Set a nested field
await events.modify('userId = :uid')
  .set('metadata.reviewed', true)
  .bind('uid', 101)
  .execute();
```

Append to a JSON array:

```javascript
await events.modify('userId = :uid')
  .arrayAppend('tags', 'processed')
  .bind('uid', 101)
  .execute();
```

## Projecting Specific Fields

```javascript
const result = await events.find()
  .fields(['userId', 'type', 'amount', 'timestamp'])
  .sort(['timestamp DESC'])
  .limit(20)
  .execute();
```

## Indexing JSON Fields for Performance

```javascript
await events.createIndex('idx_type', {
  fields: [{ field: '$.type', type: 'TEXT(32)', required: true }]
});

await events.createIndex('idx_user', {
  fields: [{ field: '$.userId', type: 'INT UNSIGNED', required: true }]
});
```

## Mixing SQL and Document Access

Collections can also be queried with standard SQL:

```sql
SELECT doc->>'$.userId' AS user_id,
       doc->>'$.type'   AS event_type,
       doc->>'$.amount' AS amount
FROM mydb.events
WHERE doc->>'$.type' = 'purchase'
ORDER BY CAST(doc->>'$.amount' AS DECIMAL(10,2)) DESC;
```

## Summary

The MySQL X DevAPI makes working with JSON documents natural and expressive. Use `add` to insert documents, `find` with path expressions for queries, `modify` to update specific JSON fields, and `createIndex` to add indexes on high-cardinality JSON paths. SQL access via `->` and `->>` operators provides an escape hatch for complex aggregations that the X DevAPI does not directly support.
