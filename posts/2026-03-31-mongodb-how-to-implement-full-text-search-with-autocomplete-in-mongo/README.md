# How to Implement Full-Text Search with Autocomplete in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Full-Text Search, Autocomplete, Atlas Search, Text Index

Description: Implement full-text search and autocomplete in MongoDB using Atlas Search indexes with edge n-grams and the $search aggregation stage.

---

## Overview

Full-text search with autocomplete requires specialized indexing that breaks words into partial tokens so that typing "wire" returns "wireless", "wired", and "wireless headphones". MongoDB offers two approaches: the built-in text index (simpler, less powerful) and MongoDB Atlas Search (Lucene-backed, supports autocomplete natively). This guide covers both.

## Approach 1 - Built-in Text Index (Self-Hosted)

### Create a Text Index

```javascript
// Single field
db.products.createIndex({ name: "text" })

// Multiple fields with weights
db.products.createIndex(
  { name: "text", description: "text", tags: "text" },
  {
    weights: { name: 10, tags: 5, description: 1 },
    name: "product_text_idx"
  }
)
```

### Full-Text Search with Text Index

```javascript
// Basic text search
db.products.find(
  { $text: { $search: "wireless headphones" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })

// Phrase search
db.products.find({
  $text: { $search: '"noise canceling"' }
})

// Exclude word
db.products.find({
  $text: { $search: "headphones -wired" }
})

// Case-insensitive language support
db.products.find({
  $text: { $search: "headphones", $language: "english", $caseSensitive: false }
})
```

### Limitation - No Autocomplete with Text Index

The built-in text index does not support prefix/autocomplete queries. For autocomplete with a text index, use a regex (unindexed, slow):

```javascript
// Avoid on large collections - COLLSCAN
db.products.find({ name: { $regex: /^wire/i } })
```

## Approach 2 - Atlas Search with Autocomplete

Atlas Search supports true autocomplete via edge n-gram tokenization.

### Create Atlas Search Index

```json
{
  "database": "ecommerce",
  "collectionName": "products",
  "name": "product-autocomplete",
  "analyzer": "lucene.standard",
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": [
        {
          "type": "string",
          "analyzer": "lucene.english"
        },
        {
          "type": "autocomplete",
          "analyzer": "lucene.standard",
          "tokenization": "edgeGram",
          "minGrams": 2,
          "maxGrams": 15,
          "foldDiacritics": true
        }
      ],
      "description": {
        "type": "string",
        "analyzer": "lucene.english"
      },
      "category": {
        "type": "stringFacet"
      },
      "price": {
        "type": "number"
      }
    }
  }
}
```

Deploy the index:

```bash
atlas clusters search indexes create \
  --clusterName myCluster \
  --file product-autocomplete-index.json
```

### Autocomplete Query

```javascript
// Autocomplete as user types "wire"
async function autocomplete(db, query, limit = 10) {
  return db.collection("products").aggregate([
    {
      $search: {
        index: "product-autocomplete",
        autocomplete: {
          query,
          path: "name",
          fuzzy: {
            maxEdits: 1,
            prefixLength: 2  // Don't apply fuzzy to first 2 chars
          },
          tokenOrder: "sequential"
        }
      }
    },
    { $limit: limit },
    {
      $project: {
        _id: 1,
        name: 1,
        price: 1,
        score: { $meta: "searchScore" }
      }
    }
  ]).toArray()
}

// Usage
const suggestions = await autocomplete(db, "wire")
// Returns: ["Wireless Headphones", "Wired Keyboard", "Wireless Mouse", ...]
```

### Full-Text Search with Highlights

```javascript
async function search(db, query, filters = {}) {
  const mustClauses = [
    {
      text: {
        query,
        path: ["name", "description"],
        fuzzy: { maxEdits: 1 }
      }
    }
  ]

  const filterClauses = []
  if (filters.category) {
    filterClauses.push({
      text: { query: filters.category, path: "category" }
    })
  }
  if (filters.maxPrice) {
    filterClauses.push({
      range: { path: "price", lte: filters.maxPrice }
    })
  }

  return db.collection("products").aggregate([
    {
      $search: {
        index: "product-autocomplete",
        compound: {
          must: mustClauses,
          filter: filterClauses
        },
        highlight: {
          path: ["name", "description"]
        }
      }
    },
    { $limit: 20 },
    {
      $project: {
        name: 1,
        description: 1,
        price: 1,
        category: 1,
        score: { $meta: "searchScore" },
        highlights: { $meta: "searchHighlights" }
      }
    }
  ]).toArray()
}
```

### Combined Autocomplete + Search API

```javascript
// Express route
const express = require("express")
const router = express.Router()

// Autocomplete suggestions
router.get("/search/suggest", async (req, res) => {
  const { q } = req.query
  if (!q || q.length < 2) return res.json([])

  const suggestions = await db.collection("products").aggregate([
    {
      $search: {
        index: "product-autocomplete",
        autocomplete: {
          query: q,
          path: "name",
          fuzzy: { maxEdits: 1 }
        }
      }
    },
    { $limit: 8 },
    { $project: { _id: 1, name: 1 } }
  ]).toArray()

  res.json(suggestions.map(s => ({ id: s._id, label: s.name })))
})

// Full search with filters and facets
router.get("/search", async (req, res) => {
  const { q, category, minPrice, maxPrice, page = 1, limit = 20 } = req.query

  const pipeline = [
    {
      $search: {
        index: "product-autocomplete",
        compound: {
          must: [
            { text: { query: q, path: ["name", "description"] } }
          ],
          filter: [
            ...(category ? [{ text: { query: category, path: "category" } }] : []),
            ...(minPrice || maxPrice ? [{
              range: {
                path: "price",
                ...(minPrice && { gte: parseFloat(minPrice) }),
                ...(maxPrice && { lte: parseFloat(maxPrice) })
              }
            }] : [])
          ]
        }
      }
    },
    { $skip: (page - 1) * limit },
    { $limit: parseInt(limit) },
    {
      $project: {
        name: 1, price: 1, category: 1, imageUrl: 1,
        score: { $meta: "searchScore" }
      }
    }
  ]

  const results = await db.collection("products").aggregate(pipeline).toArray()
  res.json({ results, page: parseInt(page), limit: parseInt(limit) })
})
```

## Debounce on the Frontend

```javascript
// Debounce autocomplete requests (wait 200ms after user stops typing)
function debounce(fn, delay) {
  let timer
  return function(...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

const fetchSuggestions = debounce(async (query) => {
  if (query.length < 2) {
    hideSuggestions()
    return
  }
  const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`)
  const suggestions = await res.json()
  showSuggestions(suggestions)
}, 200)

document.getElementById("search-input").addEventListener("input", (e) => {
  fetchSuggestions(e.target.value)
})
```

## Summary

Implementing full-text search with autocomplete in MongoDB requires Atlas Search for production use. Create a search index with an `autocomplete` field type using `edgeGram` tokenization, then use the `$search` aggregation stage with the `autocomplete` operator to return prefix-matched suggestions as users type. Combine autocomplete with full-text search, filters, and highlights in a unified search API for the best user experience.
