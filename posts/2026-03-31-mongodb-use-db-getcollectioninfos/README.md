# How to Use db.getCollectionInfos() in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Collection, Introspection, Schema, Administration

Description: Use db.getCollectionInfos() to inspect collection metadata including options, validation rules, UUID, and capped collection settings.

---

## What Is db.getCollectionInfos()

`db.getCollectionInfos()` returns an array of documents, each describing a collection in the current database. Unlike `getCollectionNames()` which returns only names, `getCollectionInfos()` provides full metadata: options, validation rules, storage settings, and the collection UUID.

## Basic Usage

```javascript
use myapp;

db.getCollectionInfos();
```

Sample output for one collection:

```json
[
  {
    "name": "users",
    "type": "collection",
    "options": {
      "validator": {
        "$jsonSchema": {
          "bsonType": "object",
          "required": ["email"],
          "properties": {
            "email": { "bsonType": "string" }
          }
        }
      },
      "validationLevel": "strict",
      "validationAction": "error"
    },
    "idIndex": { "v": 2, "key": { "_id": 1 }, "name": "_id_" },
    "info": {
      "readOnly": false,
      "uuid": "d4f2c1e8-..."
    }
  }
]
```

## Filter to a Specific Collection

Pass a filter document to narrow results:

```javascript
// Get info for only the users collection
db.getCollectionInfos({ name: "users" });

// Get info for all capped collections
db.getCollectionInfos({ "options.capped": true });
```

## Inspect Validation Rules

Extract and display validation rules for all collections:

```javascript
db.getCollectionInfos().forEach((info) => {
  const validator = info.options?.validator;
  if (validator) {
    print(`\n=== ${info.name} ===`);
    printjson(validator);
  }
});
```

This is useful for auditing which collections have schema validation enforced.

## Check for Capped Collections

```javascript
const cappedCollections = db.getCollectionInfos({ "options.capped": true });
cappedCollections.forEach((c) => {
  print(`${c.name}: size=${c.options.size}, max=${c.options.max}`);
});
```

## Detect Views vs Collections

`getCollectionInfos()` includes both collections and views. Separate them:

```javascript
const infos = db.getCollectionInfos();
const views = infos.filter((i) => i.type === "view");
const collections = infos.filter((i) => i.type === "collection");

print("Views:", views.map((v) => v.name));
print("Collections:", collections.map((c) => c.name));
```

## Using the Driver (Node.js)

Use `listCollections()` with the `nameOnly: false` option to get full metadata:

```javascript
const { MongoClient } = require("mongodb");

async function getCollectionInfos(databaseName) {
  const client = new MongoClient("mongodb://localhost:27017");
  await client.connect();
  const db = client.db(databaseName);

  const infos = await db.listCollections({}, { nameOnly: false }).toArray();
  infos.forEach((info) => {
    console.log(`${info.name} (type: ${info.type})`);
    if (info.options?.validator) {
      console.log("  Has validation schema");
    }
  });

  await client.close();
}

getCollectionInfos("myapp");
```

## Python Driver

```python
import pymongo

client = pymongo.MongoClient("mongodb://localhost:27017")
db = client["myapp"]

for info in db.list_collections():
    name = info["name"]
    coll_type = info["type"]
    has_validator = "validator" in info.get("options", {})
    print(f"{name} ({coll_type}) - validator: {has_validator}")
```

## Compare Validation Rules Across Environments

Use `getCollectionInfos()` in migration scripts to verify that staging and production have matching validators:

```javascript
const prod = db.getCollectionInfos({ name: "orders" })[0];
const prodValidator = JSON.stringify(prod.options?.validator ?? {});
// Export and compare against staging environment validator
print(prodValidator);
```

## Summary

`db.getCollectionInfos()` provides rich metadata about each collection including validation schemas, capped options, collection UUID, and type (collection vs view). Use the filter parameter to narrow results to specific collections or capped collections. In application code, use the driver's `listCollections()` method. Use it in operational scripts to audit schema validation coverage and detect configuration drift between environments.
