# How to Create and Use Collections in MySQL Document Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Collection, Document Store, JSON, X DevAPI

Description: Learn how to create, manage, and use collections in the MySQL Document Store for schema-free JSON document storage and retrieval.

---

## What are Collections?

In the MySQL Document Store, a collection is the equivalent of a table in the relational model. Each collection stores JSON documents with flexible, schema-free structure. Under the hood, a collection is an InnoDB table with a `doc` JSON column and a `_id` VARCHAR primary key. Collections are managed through the X DevAPI using MySQL Shell or a supported connector.

## Connecting to MySQL Shell

```bash
mysqlsh --uri mysqlx://root@127.0.0.1:33060
\js
```

## Creating a Collection

```javascript
const schema = session.getSchema('mydb');

// Create a new collection
const users = await schema.createCollection('users');
console.log('Collection created:', users.getName());
```

To create only if it does not exist:

```javascript
const users = await schema.createCollection('users', { reuseExistingObject: true });
```

## Verifying Collection Existence

```javascript
const collections = await schema.getCollections();
collections.forEach(c => console.log(c.getName()));
```

Or check for a specific collection:

```javascript
const col = schema.getCollection('users');
if (await col.existsInDatabase()) {
  console.log('Collection exists');
}
```

## Adding Documents

```javascript
const users = schema.getCollection('users');

await users.add([
  { username: 'alice', email: 'alice@example.com', role: 'admin', active: true },
  { username: 'bob',   email: 'bob@example.com',   role: 'user',  active: true },
  { username: 'carol', email: 'carol@example.com',  role: 'user',  active: false }
]).execute();
```

Documents without an `_id` field receive an auto-generated UUID-like string.

## Querying Collections

Find all active users:

```javascript
const result = await users.find('active = true').execute();
result.fetchAll().forEach(user => console.log(user));
```

Find with sorting and limit:

```javascript
const result = await users.find('role = :r')
  .bind('r', 'user')
  .sort(['username ASC'])
  .limit(10)
  .execute();
```

## Updating Documents

```javascript
await users.modify('username = :u')
  .set('role', 'moderator')
  .bind('u', 'bob')
  .execute();
```

Unset a field from matching documents:

```javascript
await users.modify('active = false')
  .unset('email')
  .execute();
```

## Deleting Documents

```javascript
await users.remove('active = false').execute();
```

## Dropping a Collection

```javascript
await schema.dropCollection('users');
```

## Creating an Index for Faster Lookups

```javascript
await users.createIndex('idx_username', {
  fields: [{ field: '$.username', type: 'TEXT(64)', required: true }],
  unique: true
});
```

Verify the index was created using SQL:

```sql
SHOW INDEX FROM mydb.users;
```

## Collection Count

```javascript
const count = await users.count();
console.log('Total documents:', count);
```

## Summary

MySQL Document Store collections provide a flexible, schema-free storage layer backed by InnoDB. Create collections with `createCollection`, manage documents using the fluent `add`, `find`, `modify`, and `remove` methods, and add indexes on frequently queried JSON fields to maintain query performance as collections grow. Collections and relational tables can coexist in the same schema, giving you full flexibility over your data model.
