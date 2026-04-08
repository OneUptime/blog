# How to Copy a Collection to a Different Database in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collection, Database, Administration, Migration

Description: Learn how to copy a MongoDB collection to a different database using mongodump/mongorestore, $out with db reference, or mongosh scripting techniques.

---

Copying a collection to a different database is common when splitting a monolith into separate services, creating staging environments, or archiving data to a dedicated database. MongoDB provides several tools for this operation.

## Method 1: mongodump + mongorestore (Recommended)

This method is reliable, preserves indexes, and works across different MongoDB instances:

```bash
# Dump the source collection from sourceDB
mongodump \
  --uri "mongodb://localhost:27017" \
  --db sourceDB \
  --collection myCollection \
  --out /tmp/dump

# Restore into targetDB (different database name)
# mongorestore automatically picks up the sibling .metadata.json file
# to restore indexes and collection options
mongorestore \
  --uri "mongodb://localhost:27017" \
  --db targetDB \
  --collection myCollection \
  /tmp/dump/sourceDB/myCollection.bson
```

For a remote target instance:

```bash
mongodump --uri "mongodb://source-host:27017" \
  --db sourceDB --collection myCollection --archive | \
mongorestore --uri "mongodb://target-host:27017" \
  --nsFrom="sourceDB.myCollection" --nsTo="targetDB.myCollection" --archive
```

Piping dump directly to restore avoids writing to disk.

## Method 2: $out to a Different Database

From MongoDB 4.4, `$out` can write to a different database on the same server:

```javascript
db.getSiblingDB("sourceDB").myCollection.aggregate([
  { $match: {} },
  {
    $out: {
      db: "targetDB",
      coll: "myCollection"
    }
  }
])
```

This is the fastest in-server copy and does not involve disk I/O outside the MongoDB data directory.

## Method 3: mongosh Scripting with find() + insertMany()

For cross-database copies on the same server with custom filtering:

```javascript
// In mongosh
const sourceDB = db.getSiblingDB("sourceDB");
const targetDB = db.getSiblingDB("targetDB");

const batchSize = 1000;
let skip = 0;
let totalCopied = 0;

while (true) {
  const batch = sourceDB.myCollection
    .find({})
    .skip(skip)
    .limit(batchSize)
    .toArray();

  if (batch.length === 0) break;

  targetDB.myCollection.insertMany(batch, { ordered: false });
  totalCopied += batch.length;
  skip += batchSize;
  print(`Copied ${totalCopied} documents so far...`);
}

print(`Done. Total: ${totalCopied}`);
```

## Method 4: Cross-Instance Copy Using mongoexport + mongoimport

When source and target are on different machines without network connectivity:

```bash
# Export from source
mongoexport \
  --uri "mongodb://source-host:27017/sourceDB" \
  --collection myCollection \
  --out myCollection.json

# Import to target
mongoimport \
  --uri "mongodb://target-host:27017/targetDB" \
  --collection myCollection \
  --file myCollection.json
```

Note: `mongoexport`/`mongoimport` use JSON/CSV format and do not preserve indexes automatically.

## Copying Indexes After $out or Script Methods

`$out` and `insertMany` do not copy indexes. Replicate them manually:

```javascript
const srcIndexes = db.getSiblingDB("sourceDB").myCollection.getIndexes();
const targetColl = db.getSiblingDB("targetDB").myCollection;

srcIndexes
  .filter(i => i.name !== "_id_")
  .forEach(i => {
    targetColl.createIndex(i.key, {
      name: i.name,
      ...(i.unique && { unique: true }),
      ...(i.sparse && { sparse: true })
    });
  });
```

## Verifying the Copy

```javascript
const src = db.getSiblingDB("sourceDB").myCollection.countDocuments();
const tgt = db.getSiblingDB("targetDB").myCollection.countDocuments();
print(`Source: ${src}, Target: ${tgt}, OK: ${src === tgt}`);
```

## Summary

Use `mongodump`/`mongorestore` for the most complete copy including indexes and metadata. Use `$out` with a database name for fast in-server copies when on MongoDB 4.4+. Use mongosh batched scripting for filtered or transformed copies. Always verify document counts and recreate indexes when using non-dump methods.
