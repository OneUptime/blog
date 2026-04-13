# How to Use the autocomplete Operator in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Autocomplete, Search

Description: Learn how to implement autocomplete search in MongoDB Atlas Search using the autocomplete operator with edge n-gram tokenization for fast, prefix-based suggestions.

---

## Overview

The `autocomplete` operator in MongoDB Atlas Search enables prefix-based search that powers type-ahead and search suggestions. As a user types, autocomplete returns results matching the beginning of words in indexed fields. This is different from the `text` operator which searches for complete words - `autocomplete` matches partial tokens at the start of each word.

## Setting Up the Autocomplete Index

The autocomplete operator requires a special index configuration. Standard string indexes do not support autocomplete:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": [
        {
          "type": "autocomplete",
          "analyzer": "lucene.standard",
          "tokenization": "edgeGram",
          "minGrams": 2,
          "maxGrams": 15,
          "foldDiacritics": true
        },
        {
          "type": "string"
        }
      ]
    }
  }
}
```

Key options:
- `tokenization` - `edgeGram` (prefix matching) or `nGram` (substring matching)
- `minGrams` - minimum character prefix length to index
- `maxGrams` - maximum prefix length to index
- `foldDiacritics` - normalize accented characters (e.g., treats "é" and "e" as the same)

## Basic Autocomplete Query

```javascript
// Simple prefix autocomplete
db.products.aggregate([
  {
    $search: {
      index: "default",
      autocomplete: {
        query: "lapt",   // user has typed "lapt"
        path: "title"
      }
    }
  },
  {
    $limit: 10
  },
  {
    $project: {
      title: 1,
      score: { $meta: "searchScore" }
    }
  }
])
```

This returns all products where the title contains a word starting with "lapt", such as "Laptop", "Laptop Stand", etc.

## Autocomplete with Token Order

Control whether tokens must appear in order:

```javascript
db.products.aggregate([
  {
    $search: {
      autocomplete: {
        query: "wire head",
        path: "title",
        tokenOrder: "sequential"  // tokens must appear in this order
      }
    }
  },
  { $limit: 10 }
])

// vs any order
db.products.aggregate([
  {
    $search: {
      autocomplete: {
        query: "wire head",
        path: "title",
        tokenOrder: "any"  // tokens can appear in any order
      }
    }
  },
  { $limit: 10 }
])
```

## Fuzzy Autocomplete

Combine autocomplete with fuzzy matching to tolerate typos:

```javascript
db.products.aggregate([
  {
    $search: {
      autocomplete: {
        query: "labtop",  // typo
        path: "title",
        fuzzy: {
          maxEdits: 1,
          prefixLength: 2
        }
      }
    }
  },
  { $limit: 10 },
  { $project: { title: 1, score: { $meta: "searchScore" } } }
])
```

## Autocomplete Across Multiple Fields

Search multiple fields with autocomplete:

```javascript
db.products.aggregate([
  {
    $search: {
      compound: {
        should: [
          {
            autocomplete: {
              query: "wires",
              path: "title",
              score: { boost: { value: 3 } }  // boost title matches
            }
          },
          {
            autocomplete: {
              query: "wires",
              path: "description"
            }
          }
        ]
      }
    }
  },
  { $limit: 10 },
  { $project: { title: 1, score: { $meta: "searchScore" } } }
])
```

## Building a Search-As-You-Type API

Implement a backend endpoint that returns autocomplete suggestions:

```javascript
// Node.js Express example
const express = require('express');
const { MongoClient } = require('mongodb');

const app = express();
const client = new MongoClient(process.env.MONGODB_URI);

app.get('/api/autocomplete', async (req, res) => {
  const { q } = req.query;
  
  if (!q || q.length < 2) {
    return res.json([]);
  }
  
  try {
    const db = client.db('mydb');
    const results = await db.collection('products').aggregate([
      {
        $search: {
          index: 'autocomplete_index',
          autocomplete: {
            query: q,
            path: 'title',
            fuzzy: { maxEdits: 1, prefixLength: 2 }
          }
        }
      },
      { $limit: 8 },
      { $project: { _id: 0, title: 1, score: { $meta: 'searchScore' } } }
    ]).toArray();
    
    res.json(results.map(r => r.title));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000);
```

## Combining Autocomplete with Post-Filters

```javascript
// Autocomplete for product title, filter by category and inStock
db.products.aggregate([
  {
    $search: {
      compound: {
        must: [
          {
            autocomplete: {
              query: "headph",
              path: "title"
            }
          }
        ],
        filter: [
          {
            equals: {
              path: "inStock",
              value: true
            }
          },
          {
            text: {
              query: "electronics",
              path: "category"
            }
          }
        ]
      }
    }
  },
  { $limit: 10 },
  { $project: { title: 1, price: 1, inStock: 1 } }
])
```

## Deduplicating Suggestions

When multiple products have similar titles, deduplicate suggestions:

```javascript
db.products.aggregate([
  {
    $search: {
      autocomplete: {
        query: "laptop",
        path: "title"
      }
    }
  },
  {
    $addFields: {
      searchScore: { $meta: "searchScore" }
    }
  },
  {
    $group: {
      _id: "$title",
      doc: { $first: "$$ROOT" },
      score: { $max: "$searchScore" }
    }
  },
  { $sort: { score: -1 } },
  { $limit: 10 },
  { $replaceRoot: { newRoot: "$doc" } }
])
```

## Summary

The `autocomplete` operator in MongoDB Atlas Search powers type-ahead search by indexing word prefixes using edge n-gram tokenization. The index requires explicit configuration with `type: "autocomplete"` - standard string indexes do not support this feature. Combine autocomplete with `fuzzy` matching to tolerate typos, use `tokenOrder: "sequential"` for multi-word prefix matching, and integrate with the `compound` operator to filter results by other criteria. This operator is the recommended foundation for building search-as-you-type features in MongoDB Atlas applications.
