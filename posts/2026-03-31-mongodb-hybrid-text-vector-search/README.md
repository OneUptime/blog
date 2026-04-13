# How to Implement Hybrid Search Combining Text and Vector in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Vector Search

Description: Implement hybrid search in MongoDB by combining Atlas Search keyword results with Atlas Vector Search semantic results using Reciprocal Rank Fusion for better relevance.

---

Hybrid search combines the precision of keyword matching with the semantic understanding of vector search. This guide shows a production-ready implementation using Reciprocal Rank Fusion (RRF) to merge the two ranked result sets.

## Why Hybrid Search

- **Keyword search** handles exact product codes, names, and rare terms well
- **Vector search** handles intent, synonyms, and concept matching well
- **Hybrid** covers both, reducing failure modes in production

## Index Setup

You need both a text search index and a vector search index on the same collection:

Atlas Search index (for keyword search):

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": { "type": "string", "analyzer": "lucene.standard" },
      "description": { "type": "string", "analyzer": "lucene.standard" }
    }
  }
}
```

Atlas Vector Search index (for semantic search):

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}
```

## Hybrid Pipeline with RRF

The hybrid pipeline runs both searches and merges with Reciprocal Rank Fusion:

```javascript
async function hybridSearch(db, query, queryEmbedding, options = {}) {
  const {
    limit = 10,
    rrf_k = 60,
    keywordWeight = 0.4,
    vectorWeight = 0.6
  } = options;

  const pipeline = [
    // Keyword search leg
    {
      $search: {
        index: "text_index",
        text: {
          query: query,
          path: ["title", "description"]
        }
      }
    },
    { $limit: 20 },
    { $addFields: { ks: { $meta: "searchScore" } } },
    {
      $setWindowFields: {
        sortBy: { ks: -1 },
        output: { ks_rank: { $documentNumber: {} } }
      }
    },
    {
      $project: {
        _id: 1,
        title: 1,
        description: 1,
        ks_rank: 1
      }
    },

    // Merge vector search results
    {
      $unionWith: {
        coll: "products",
        pipeline: [
          {
            $vectorSearch: {
              index: "vector_index",
              path: "embedding",
              queryVector: queryEmbedding,
              numCandidates: 100,
              limit: 20
            }
          },
          { $addFields: { vs: { $meta: "vectorSearchScore" } } },
          {
            $setWindowFields: {
              sortBy: { vs: -1 },
              output: { vs_rank: { $documentNumber: {} } }
            }
          },
          {
            $project: {
              _id: 1,
              title: 1,
              description: 1,
              vs_rank: 1
            }
          }
        ]
      }
    },

    // Group and merge ranks
    {
      $group: {
        _id: "$_id",
        title: { $first: "$title" },
        description: { $first: "$description" },
        ks_rank: { $min: { $ifNull: ["$ks_rank", 1000] } },
        vs_rank: { $min: { $ifNull: ["$vs_rank", 1000] } }
      }
    },

    // Compute RRF score
    {
      $addFields: {
        rrf: {
          $add: [
            { $multiply: [keywordWeight, { $divide: [1, { $add: [rrf_k, "$ks_rank"] }] }] },
            { $multiply: [vectorWeight, { $divide: [1, { $add: [rrf_k, "$vs_rank"] }] }] }
          ]
        }
      }
    },
    { $sort: { rrf: -1 } },
    { $limit: limit },
    { $project: { _id: 1, title: 1, description: 1, rrf: 1 } }
  ];

  return db.collection("products").aggregate(pipeline).toArray();
}
```

## Python Implementation

```python
def hybrid_search(collection, query: str, query_embedding: list, limit: int = 10) -> list:
    pipeline = [
        {
            "$search": {
                "index": "text_index",
                "text": {"query": query, "path": ["title", "description"]}
            }
        },
        {"$limit": 20},
        {"$addFields": {"ks": {"$meta": "searchScore"}}},
        {
            "$setWindowFields": {
                "sortBy": {"ks": -1},
                "output": {"ks_rank": {"$documentNumber": {}}}
            }
        },
        {"$project": {"_id": 1, "title": 1, "ks_rank": 1}},
        {
            "$unionWith": {
                "coll": collection.name,
                "pipeline": [
                    {
                        "$vectorSearch": {
                            "index": "vector_index",
                            "path": "embedding",
                            "queryVector": query_embedding,
                            "numCandidates": 100,
                            "limit": 20
                        }
                    },
                    {"$addFields": {"vs": {"$meta": "vectorSearchScore"}}},
                    {
                        "$setWindowFields": {
                            "sortBy": {"vs": -1},
                            "output": {"vs_rank": {"$documentNumber": {}}}
                        }
                    },
                    {"$project": {"_id": 1, "title": 1, "vs_rank": 1}}
                ]
            }
        },
        {"$group": {"_id": "$_id", "title": {"$first": "$title"},
                    "ks_rank": {"$min": {"$ifNull": ["$ks_rank", 1000]}},
                    "vs_rank": {"$min": {"$ifNull": ["$vs_rank", 1000]}}}},
        {"$addFields": {"score": {"$add": [
            {"$divide": [0.4, {"$add": [60, "$ks_rank"]}]},
            {"$divide": [0.6, {"$add": [60, "$vs_rank"]}]}
        ]}}},
        {"$sort": {"score": -1}},
        {"$limit": limit}
    ]
    return list(collection.aggregate(pipeline))
```

## Tuning Keyword vs Vector Weights

The relative weights depend on your data and user intent:

```text
keywordWeight=0.7, vectorWeight=0.3 -> Better for product catalogs with SKUs/codes
keywordWeight=0.5, vectorWeight=0.5 -> Balanced for general content search
keywordWeight=0.3, vectorWeight=0.7 -> Better for Q&A and conceptual search
```

Run A/B tests or offline evaluations with labeled queries to find the best balance.

## Summary

MongoDB hybrid search combines keyword and vector results using `$unionWith` to merge two independent search pipelines, then applies Reciprocal Rank Fusion to produce a unified ranked list. Adjust the keyword and vector weights based on your content type and query patterns. This approach is especially effective for e-commerce and knowledge base search where both exact terms and semantic intent matter.
