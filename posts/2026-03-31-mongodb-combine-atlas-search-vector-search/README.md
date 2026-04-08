# How to Combine Atlas Search and Vector Search in One Pipeline in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Vector Search

Description: Build a hybrid search pipeline in MongoDB that combines keyword-based Atlas Search and semantic Vector Search results using score fusion for better recall.

---

Keyword search and vector search have complementary strengths. Keyword search excels at exact term matching and rare queries. Vector search captures semantic similarity but can miss documents that use very different wording. Combining both in a single aggregation pipeline produces better results than either alone.

## Hybrid Search Architecture

MongoDB does not have a single hybrid operator. The recommended approach is Reciprocal Rank Fusion (RRF), which merges ranked lists from two independent searches:

```text
Atlas Search ($search)     Vector Search ($vectorSearch)
       |                             |
    Rankings                     Rankings
       |_____________  ______________|
                     |
              RRF Score Merge
                     |
              Final ranked results
```

## Step 1: Run Both Searches with $unionWith

Use `$unionWith` to run a vector search pipeline and merge it with the keyword search results:

```javascript
db.products.aggregate([
  // Stage 1: Keyword search
  {
    $search: {
      index: "default",
      text: {
        query: "wireless noise cancelling headphones",
        path: ["title", "description"]
      }
    }
  },
  { $limit: 20 },
  {
    $project: {
      _id: 1,
      title: 1,
      price: 1,
      keywordScore: { $meta: "searchScore" },
      source: { $literal: "keyword" }
    }
  },

  // Stage 2: Union with vector search results
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
        {
          $project: {
            _id: 1,
            title: 1,
            price: 1,
            vectorScore: { $meta: "vectorSearchScore" },
            source: { $literal: "vector" }
          }
        }
      ]
    }
  }
])
```

## Step 2: Apply Reciprocal Rank Fusion

Group by `_id` and compute the RRF score. RRF score = 1 / (k + rank) where k is typically 60:

```javascript
// Continued from above pipeline...

// Create a unified score field for ranking within each source
{
  $addFields: {
    searchScore: { $ifNull: ["$keywordScore", "$vectorScore"] }
  }
},
// Assign positional ranks within each source partition
{
  $setWindowFields: {
    partitionBy: "$source",
    sortBy: { searchScore: -1 },
    output: {
      rank: { $denseRank: {} }
    }
  }
},
// Group by document and compute RRF score using ranks
{
  $group: {
    _id: "$_id",
    title: { $first: "$title" },
    price: { $first: "$price" },
    ranks: { $push: { source: "$source", rank: "$rank" } }
  }
},
{
  $addFields: {
    rrfScore: {
      $sum: {
        $map: {
          input: "$ranks",
          as: "r",
          in: {
            $divide: [
              1,
              { $add: [60, "$$r.rank"] }
            ]
          }
        }
      }
    }
  }
},
{ $sort: { rrfScore: -1 } },
{ $limit: 10 }
```

## Simplified Hybrid Using $project Normalization

An alternative to RRF is score normalization followed by weighted sum. Normalize both scores to 0-1 range first, then combine:

```javascript
// After getting results from both searches with scores...
{
  $addFields: {
    hybridScore: {
      $add: [
        { $multiply: [0.4, { $ifNull: ["$normalizedKeywordScore", 0] }] },
        { $multiply: [0.6, { $ifNull: ["$normalizedVectorScore", 0] }] }
      ]
    }
  }
}
```

## Practical Pipeline with Helper Function

```python
def hybrid_search(query: str, query_embedding: list, limit: int = 10) -> list:
    pipeline = [
        {
            "$search": {
                "index": "default",
                "text": {"query": query, "path": ["title", "description"]}
            }
        },
        {"$limit": 20},
        {"$project": {"_id": 1, "title": 1, "ks": {"$meta": "searchScore"}, "src": {"$literal": "kw"}}},
        {
            "$unionWith": {
                "coll": "products",
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
                    {"$project": {"_id": 1, "title": 1, "vs": {"$meta": "vectorSearchScore"}, "src": {"$literal": "vec"}}}
                ]
            }
        },
        {"$group": {"_id": "$_id", "title": {"$first": "$title"}, "ks": {"$max": "$ks"}, "vs": {"$max": "$vs"}}},
        {"$addFields": {"score": {"$add": [{"$ifNull": ["$ks", 0]}, {"$multiply": [10, {"$ifNull": ["$vs", 0]}]}]}}},
        {"$sort": {"score": -1}},
        {"$limit": limit}
    ]
    return list(collection.aggregate(pipeline))
```

## Summary

Combining Atlas Search and Vector Search uses `$unionWith` to execute both pipelines independently, then groups results by `_id` and merges their scores using Reciprocal Rank Fusion or weighted normalization. This hybrid approach improves recall for both exact-match queries (where keyword search wins) and conceptual queries (where vector search wins), without requiring changes to your document schema.
