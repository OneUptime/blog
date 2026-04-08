# How to Convert a Regular Collection to a Capped Collection in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Capped Collection, Database Administration, Storage, Collection Management

Description: Learn how to use the convertToCapped command to turn an existing MongoDB collection into a capped collection with a fixed size limit.

---

MongoDB does not support altering a regular collection into a capped one through `collMod`, but it provides the `convertToCapped` command for this purpose. The conversion is an in-place operation but it has important caveats you should understand before running it in production.

## Basic Syntax

```javascript
db.runCommand({
  convertToCapped: "events",
  size: 10485760   // 10 MB in bytes
})
```

The `size` parameter is required and sets the maximum byte size of the capped collection. Once full, MongoDB automatically removes the oldest documents in insertion order to make room for new ones.

## Step-by-Step Conversion

### 1. Check Current Collection Stats

```javascript
db.events.stats()
```

Note the current `size` to pick an appropriate cap that retains enough history.

### 2. Run the Conversion

```javascript
use mydb

db.runCommand({
  convertToCapped: "events",
  size: 52428800   // 50 MB
})
```

A successful response returns `{ "ok": 1 }`.

### 3. Verify the Result

```javascript
db.getCollectionInfos({ name: "events" })
// The "options" field should include { "capped": true, "size": 52428800 }
```

## Important Caveats

**Existing documents are preserved but may be removed.** If the existing data is larger than the specified `size`, MongoDB truncates older documents immediately to fit within the cap.

**Indexes are not automatically recreated.** The conversion drops and rebuilds the collection internally, which removes secondary indexes. Recreate them manually afterward:

```javascript
db.events.createIndex({ timestamp: 1 })
```

**The operation takes a global write lock** on older MongoDB versions. On MongoDB 4.2+, it holds an exclusive database-level lock for the duration. Plan for downtime or use a blue/green strategy.

**No `max` document limit can be set during conversion.** To add a document count ceiling, create a new capped collection and copy data:

```javascript
db.createCollection("events_capped", {
  capped: true,
  size: 52428800,
  max: 100000
})
db.events.find().forEach(doc => db.events_capped.insertOne(doc))
db.events.drop()
db.events_capped.renameCollection("events")
```

## Checking Whether a Collection Is Capped

```javascript
db.events.isCapped()   // returns true or false
```

## When to Use convertToCapped

- Converting an existing log or audit collection to bounded storage.
- Migrating a development collection to a capped one without recreating the application schema.

For new collections with fixed storage needs, always prefer `db.createCollection` with `capped: true` from the start.

## Summary

Use `db.runCommand({ convertToCapped: "<name>", size: <bytes> })` to convert a regular MongoDB collection into a capped collection. After conversion, verify the collection options and recreate any secondary indexes that were dropped during the process.
