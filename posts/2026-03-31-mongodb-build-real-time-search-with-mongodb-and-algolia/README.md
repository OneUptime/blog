# How to Build Real-Time Search with MongoDB and Algolia

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Algolia, Search, Change Stream, Real-Time

Description: Build real-time search with MongoDB and Algolia by syncing documents via Change Streams, configuring ranking, and implementing InstantSearch in the front end.

---

## Introduction

Algolia is a hosted search platform known for its speed, relevance tuning, and InstantSearch UI libraries. When backed by MongoDB as the data store, you get durable storage plus best-in-class search UX. This guide covers setting up the Algolia index, syncing MongoDB data, and building a search front end.

## Setting Up Algolia Client

```javascript
const { algoliasearch } = require("algoliasearch")
const { MongoClient } = require("mongodb")

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_KEY
)

// Configure index settings
await client.setSettings({
  indexName: "products",
  indexSettings: {
    searchableAttributes: [
      "name",
      "description",
      "unordered(tags)",
      "category"
    ],
    attributesForFaceting: ["category", "brand", "inStock"],
    customRanking: ["desc(popularity)", "asc(price)"],
    attributesToHighlight: ["name", "description"],
    typoTolerance: true
  }
})
```

## Initial Data Import from MongoDB

```javascript
async function importToAlgolia() {
  const mongo = new MongoClient(process.env.MONGODB_URI)
  await mongo.connect()
  const db = mongo.db("myapp")

  const products = await db.collection("products").find({}).toArray()

  const records = products.map(product => ({
    objectID: product._id.toString(),
    name: product.name,
    description: product.description,
    category: product.category,
    brand: product.brand,
    price: product.price,
    inStock: product.stock > 0,
    tags: product.tags || [],
    popularity: product.views || 0
  }))

  await client.saveObjects({ indexName: "products", objects: records })
  console.log(`Indexed ${records.length} records`)

  await mongo.close()
}
```

## Real-Time Sync with Change Streams

```javascript
async function startChangeStreamSync() {
  const db = mongo.db("myapp")
  const changeStream = db.collection("products").watch([], {
    fullDocument: "updateLookup"
  })

  changeStream.on("change", async (change) => {
    const objectID = change.documentKey._id.toString()

    switch (change.operationType) {
      case "insert":
      case "update":
      case "replace": {
        const doc = change.fullDocument
        await client.saveObject({
          indexName: "products",
          body: {
            objectID,
            name: doc.name,
            description: doc.description,
            category: doc.category,
            price: doc.price,
            inStock: doc.stock > 0,
            tags: doc.tags || [],
            popularity: doc.views || 0
          }
        })
        break
      }
      case "delete":
        await client.deleteObject({ indexName: "products", objectID })
        break
    }
  })

  changeStream.on("error", async (err) => {
    console.error("Change stream error:", err.message)
    await new Promise(resolve => setTimeout(resolve, 5000))
    startChangeStreamSync()
  })
}
```

## Partial Updates

For high-throughput write environments, use `partialUpdateObject` to push only changed fields:

```javascript
changeStream.on("change", async (change) => {
  if (change.operationType === "update") {
    const objectID = change.documentKey._id.toString()
    const updatedFields = {}

    for (const [field, value] of Object.entries(change.updateDescription.updatedFields)) {
      updatedFields[field] = value
    }

    await client.partialUpdateObject({
      indexName: "products",
      objectID,
      attributesToUpdate: updatedFields
    })
  }
})
```

## InstantSearch React Front End

```javascript
import { liteClient as algoliasearch } from "algoliasearch/lite"
import { InstantSearch, SearchBox, Hits, RefinementList } from "react-instantsearch"

const searchClient = algoliasearch(
  process.env.REACT_APP_ALGOLIA_APP_ID,
  process.env.REACT_APP_ALGOLIA_SEARCH_KEY
)

function App() {
  return (
    <InstantSearch searchClient={searchClient} indexName="products">
      <SearchBox placeholder="Search products..." />
      <RefinementList attribute="category" />
      <Hits hitComponent={ProductHit} />
    </InstantSearch>
  )
}
```

## Summary

MongoDB and Algolia integrate through batch import for existing data and Change Streams for ongoing sync. Use `saveObject` with an `objectID` matching MongoDB's `_id.toString()` in the record body to ensure idempotent upserts. For write-heavy collections, `partialUpdateObject` reduces Algolia write unit consumption by only syncing changed fields. Pair with Algolia's InstantSearch libraries to deliver sub-100ms search experiences with minimal front-end code.
