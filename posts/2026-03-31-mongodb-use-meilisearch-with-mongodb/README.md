# How to Use Meilisearch with MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Meilisearch, Search, Synchronization, Full-Text Search

Description: Integrate Meilisearch with MongoDB to add fast full-text search capabilities by syncing documents using Change Streams for real-time indexing.

---

## Introduction

Meilisearch is a fast, typo-tolerant search engine that complements MongoDB well. MongoDB handles persistent document storage and complex queries, while Meilisearch serves full-text search with instant results. This guide covers syncing MongoDB documents to Meilisearch using Change Streams and building a search API.

## Setting Up Meilisearch

```bash
# Run Meilisearch with Docker
docker run -d \
  --name meilisearch \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=masterKey \
  -v meili_data:/meili_data \
  getmeili/meilisearch:latest
```

## Initial Data Sync

Index existing MongoDB documents into Meilisearch:

```javascript
const { MongoClient } = require("mongodb")
const { Meilisearch } = require("meilisearch")

const mongo = new MongoClient(process.env.MONGODB_URI)
const meili = new Meilisearch({
  host: "http://localhost:7700",
  apiKey: "masterKey"
})

async function initialSync() {
  await mongo.connect()
  const db = mongo.db("myapp")
  const index = meili.index("products")

  // Configure searchable attributes
  await index.updateSettings({
    searchableAttributes: ["name", "description", "category", "tags"],
    filterableAttributes: ["category", "price", "inStock"],
    sortableAttributes: ["price", "createdAt"]
  })

  const products = await db.collection("products").find({}).toArray()

  // Transform _id for Meilisearch (requires string id field)
  const docs = products.map(p => ({
    ...p,
    id: p._id.toString(),
    _id: undefined
  }))

  const task = await index.addDocuments(docs, { primaryKey: "id" })
  await meili.tasks.waitForTask(task.taskUid)
  console.log(`Indexed ${docs.length} products`)
}
```

## Real-Time Sync with Change Streams

```javascript
async function watchAndSync() {
  const db = mongo.db("myapp")
  const index = meili.index("products")

  const changeStream = db.collection("products").watch([], {
    fullDocument: "updateLookup"
  })

  changeStream.on("change", async (change) => {
    const id = change.documentKey._id.toString()

    switch (change.operationType) {
      case "insert":
      case "update":
      case "replace":
        const doc = change.fullDocument
        await index.addDocuments([{
          ...doc,
          id,
          _id: undefined
        }])
        break

      case "delete":
        await index.deleteDocument(id)
        break
    }
  })

  console.log("Watching MongoDB for changes...")
}
```

## Search API Endpoint

```javascript
const express = require("express")
const app = express()

app.get("/search", async (req, res) => {
  const { q, category, maxPrice, page = 1 } = req.query

  const filters = []
  if (category) filters.push(`category = "${category}"`)
  if (maxPrice) filters.push(`price <= ${maxPrice}`)

  const results = await meili.index("products").search(q, {
    filter: filters.join(" AND "),
    sort: ["price:asc"],
    limit: 20,
    offset: (page - 1) * 20,
    attributesToHighlight: ["name", "description"]
  })

  res.json({
    hits: results.hits,
    total: results.estimatedTotalHits,
    page: parseInt(page)
  })
})
```

## Handling the _id Transformation

MongoDB uses `ObjectId` for `_id`, but Meilisearch requires a numeric or string primary key (defaulting to a field named `id` if not specified):

```javascript
function toMeiliDoc(mongoDoc) {
  const { _id, ...rest } = mongoDoc
  return { id: _id.toString(), ...rest }
}

function fromMeiliHit(hit) {
  const { id, ...rest } = hit
  return { _id: id, ...rest }
}
```

## Summary

Meilisearch and MongoDB complement each other well - MongoDB stores canonical document data while Meilisearch provides sub-50ms typo-tolerant full-text search. The key integration pattern is initial bulk sync via `addDocuments`, followed by real-time updates through MongoDB Change Streams. Always transform MongoDB's `_id` ObjectId to a string `id` field when indexing, and use Meilisearch's `filterableAttributes` and `sortableAttributes` settings to enable faceted search and sorting.
