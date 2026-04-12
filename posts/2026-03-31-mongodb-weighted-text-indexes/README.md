# How to Use Weighted Text Indexes in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Text Index, Full-Text Search, Performance, Indexing

Description: Learn how to assign weights to fields in a MongoDB text index so that matches in high-priority fields like title rank higher than matches in body text.

---

MongoDB text indexes support field weights, letting you control how much influence each field has on the relevance score. By default every indexed field gets a weight of 1, but you can boost fields like `title` or `tags` to surface more relevant results.

## Creating a Weighted Text Index

Use `createIndex` with a `weights` option:

```javascript
db.articles.createIndex(
  {
    title: "text",
    summary: "text",
    body: "text"
  },
  {
    weights: {
      title:   10,
      summary:  5,
      body:     1
    },
    name: "article_text_idx"
  }
)
```

A match in `title` now contributes 10x the score of a match in `body`.

## Querying with textScore

Retrieve the computed relevance score using `$meta`:

```javascript
db.articles.find(
  { $text: { $search: "mongodb performance" } },
  { score: { $meta: "textScore" } }
).sort({ score: { $meta: "textScore" } })
```

Results with the search terms appearing in `title` will float to the top.

## Inspecting Index Weights

```javascript
db.articles.getIndexes().filter(idx => idx.name === "article_text_idx")
```

The output includes a `weights` map so you can verify the configuration.

## Practical Weighting Strategy

| Field    | Suggested Weight | Reasoning                         |
|----------|-----------------|-----------------------------------|
| title    | 10              | Exact-topic signal, short field   |
| tags     | 8               | Curated keywords                  |
| summary  | 5               | Author-written synopsis           |
| body     | 1               | Long text, lots of noise          |

## Updating Weights

Text index weights are immutable. To change them, drop the index and recreate it:

```javascript
db.articles.dropIndex("article_text_idx")

db.articles.createIndex(
  { title: "text", summary: "text", body: "text" },
  {
    weights: { title: 15, summary: 6, body: 1 },
    name: "article_text_idx"
  }
)
```

On large collections, run this during off-peak hours or use a rolling build strategy.

## Combining Weights with Filters

You can still add equality filters alongside text queries:

```javascript
db.articles.find(
  {
    $text: { $search: "replica set" },
    category: "operations"
  },
  { score: { $meta: "textScore" }, title: 1 }
).sort({ score: { $meta: "textScore" } })
```

The index applies weights, while the `category` filter further narrows the result set. For the `category` filter to narrow the candidate set *before* scoring, include it as a prefix field in a compound text index.

## Common Pitfalls

- **Only one text index per collection** - all fields and weights must be declared together.
- **Weights do not affect which documents match** - they only affect ranking.
- **Very high weights on short fields** can push low-quality exact matches above genuinely relevant long-form content.

## Summary

Weighted text indexes let you tune MongoDB full-text search relevance by assigning numeric weights to each indexed field. Create the index with a `weights` option, query with `$meta: "textScore"`, and sort by score. To change weights you must drop and recreate the index.
