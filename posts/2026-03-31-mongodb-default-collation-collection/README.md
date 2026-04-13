# How to Set Default Collation on a Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collation, Collection, Schema, Configuration

Description: Learn how to set a default collation on a MongoDB collection so all queries and sorts automatically use locale-aware string comparison without per-query collation.

---

## What Is a Default Collection Collation?

MongoDB allows you to associate a default collation with a collection at creation time. Once set, any query, sort, or index on that collection automatically uses that collation unless you explicitly override it with a different one in the query or index definition.

This is particularly useful when an entire collection stores data in a single language - you set the collation once and all operations benefit from it automatically.

## Setting Collation at Collection Creation

Use `db.createCollection()` with the `collation` option:

```javascript
db.createCollection("customers", {
  collation: { locale: "fr", strength: 2 }
})
```

All subsequent queries and sorts on `customers` that do not specify their own collation will use French locale with case-insensitive comparison (strength 2).

## Verifying the Default Collation

Check the collection's collation using `listCollections`:

```javascript
db.runCommand({
  listCollections: 1,
  filter: { name: "customers" }
})
```

The `options.collation` field in the response shows the configured default.

Or use the helper:

```javascript
db.getCollectionInfos({ name: "customers" })[0].options.collation
```

## Queries Inherit the Default Collation

After setting the default, queries automatically use it:

```javascript
// Finds "alice", "Alice", "ALICE" without per-query collation
db.customers.find({ name: "alice" })
```

```javascript
// Sorts correctly for French locale
db.customers.find({}).sort({ name: 1 })
```

No need to append `.collation(...)` to every call.

## Indexes Inherit the Default Collation Too

Indexes created without an explicit collation inherit the collection's default:

```javascript
// This index uses the collection default collation (fr, strength 2)
db.customers.createIndex({ name: 1 })
```

And queries using that collation will use the index efficiently.

## Overriding the Default Collation

You can override the default by supplying a different collation on the query:

```javascript
// Override to use strength 3 (case-sensitive) for this specific query
db.customers.find({ name: "Alice" }).collation({ locale: "fr", strength: 3 })
```

Or use the simple binary collation to bypass locale-aware comparison entirely:

```javascript
db.customers.find({ name: "Alice" }).collation({ locale: "simple" })
```

## Changing Collection Collation After Creation

MongoDB does not support changing a collection's default collation in-place. To change it:

1. Create a new collection with the desired collation
2. Copy the data using `$merge` or `mongodump`/`mongorestore`
3. Rename or swap the collections

```javascript
// Export data to a new collection with different collation
db.createCollection("customers_new", { collation: { locale: "de", strength: 2 } })
db.customers.aggregate([{ $merge: { into: "customers_new" } }])
```

Then drop the old collection and rename:

```javascript
db.customers.drop()
db.customers_new.renameCollection("customers")
```

## Full Example: Multi-Language App

For a multi-tenant app where each tenant has its own database with a language-specific collection:

```javascript
function createTenantCollection(dbName, locale) {
  const tenantDb = db.getSiblingDB(dbName);
  tenantDb.createCollection("users", {
    collation: { locale: locale, strength: 2 }
  });
  tenantDb.users.createIndex({ email: 1 }, { unique: true });
  tenantDb.users.createIndex({ lastName: 1, firstName: 1 });
  print(`Created users collection in ${dbName} with locale ${locale}`);
}

createTenantCollection("tenant_fr", "fr");
createTenantCollection("tenant_de", "de");
createTenantCollection("tenant_es", "es");
```

## Limitations

- Default collation cannot be changed after collection creation without recreation
- The `_id` index is always created with simple (binary) collation, so `_id` lookups use binary comparison regardless of collection collation
- Capped collections support default collation
- Time-series collections support default collation from MongoDB 6.0

## Summary

Setting a default collation on a collection simplifies code by eliminating per-query collation specifications. Create the collection with `db.createCollection()` and the `collation` option, and all queries, sorts, and indexes automatically inherit it. Override only when a specific operation needs different string comparison behavior.
