# How to Use db.collection.validate() in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Validation, Collection, Database, Administration

Description: Learn how to use db.collection.validate() in MongoDB to check data integrity, detect corruption, and verify index consistency on your collections.

---

## What Is db.collection.validate()

The `db.collection.validate()` command inspects a MongoDB collection's data structures and indexes, checking for inconsistencies or corruption. It is primarily an administrative tool used during troubleshooting or after unexpected shutdowns.

Running validation on large collections can be slow and resource-intensive. Plan accordingly, especially on production systems.

## Basic Usage

Connect via `mongosh` and run:

```javascript
db.orders.validate()
```

This performs a full validation including data and indexes. The output includes a `valid` boolean and a list of `errors` and `warnings`.

Sample output:

```javascript
{
  ns: 'mydb.orders',
  nInvalidDocuments: 0,
  nrecords: 5240,
  nIndexes: 3,
  valid: true,
  errors: [],
  warnings: [],
  ok: 1
}
```

## Locking and Performance Considerations

The `validate` command obtains an exclusive lock on the collection, blocking all reads and writes until it finishes. On a secondary, it can block all other operations on that node.

To minimize impact on production systems:

- Run validation on a secondary that is not serving reads
- Consider using `rs.stepDown()` to step down a primary before validating
- Isolate a replica set member from client traffic before running validation

## Checking a Specific Collection Programmatically

You can wrap the validate call in a script to check all collections in a database:

```javascript
const dbName = db.getName();
db.getCollectionNames().forEach(function(collName) {
  const result = db.getCollection(collName).validate();
  if (!result.valid) {
    print(`INVALID: ${dbName}.${collName}`);
    printjson(result.errors);
  } else {
    print(`OK: ${dbName}.${collName}`);
  }
});
```

## Interpreting Validation Results

Key fields in the output:

| Field | Meaning |
|---|---|
| `valid` | `true` if no errors found |
| `nInvalidDocuments` | Documents that failed to parse |
| `errors` | List of detected inconsistencies |
| `warnings` | Non-critical observations |
| `keysPerIndex` | Number of index keys per index |

If `valid` is `false` or `nInvalidDocuments` is greater than zero, the collection may have corruption requiring repair or restore from backup.

## When to Use validate()

Run `validate()` in these situations:

- After an unclean shutdown or power loss
- When queries return unexpected results and you suspect index corruption
- Before and after a major upgrade to confirm data integrity
- As part of a periodic health check on critical collections

## Running via the Admin Command

You can also run the validate command directly on the admin shell:

```javascript
db.runCommand({ validate: "orders", full: true })
```

Setting `full: true` forces a checkpoint, flushing all in-memory data to disk before verifying the on-disk data. This ensures validation covers data that may not yet have been persisted.

## Summary

`db.collection.validate()` is a built-in MongoDB tool for verifying collection and index integrity. Because it takes an exclusive collection lock, plan to run it during maintenance windows or on isolated replica set members. Its output highlights corruption, invalid documents, and index inconsistencies. Incorporating periodic validation checks into your database maintenance routine helps catch data integrity issues before they impact your application.
