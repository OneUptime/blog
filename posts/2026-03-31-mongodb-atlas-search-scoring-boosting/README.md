# How to Use Scoring and Boosting in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Full-Text Search

Description: Learn how to control relevance ranking in MongoDB Atlas Search using score modifiers, boost, and constant scoring to surface the most relevant results.

---

MongoDB Atlas Search uses a Lucene-based relevance scoring model by default. Every document returned by a `$search` stage gets a score, and results are ranked highest-first. Understanding how to influence that score lets you build more useful search experiences.

## Default Scoring

By default, Atlas Search uses BM25 (Best Match 25) scoring, which incorporates term frequency, inverse document frequency, and field-length normalization. A match on a rare term in a short field scores higher than a match on a common term in a long field.

```javascript
db.products.aggregate([
  {
    $search: {
      index: "default",
      text: {
        query: "wireless headphones",
        path: ["title", "description"]
      }
    }
  },
  { $limit: 5 },
  { $project: { title: 1, score: { $meta: "searchScore" } } }
])
```

## Boosting a Field

Use the `score` option with `boost` to multiply the score contribution from a particular field. Here, matches in `title` are weighted 3x more than matches in `description`:

```javascript
db.products.aggregate([
  {
    $search: {
      index: "default",
      text: {
        query: "wireless headphones",
        path: [
          { value: "title", score: { boost: { value: 3 } } },
          { value: "description", score: { boost: { value: 1 } } }
        ]
      }
    }
  },
  { $project: { title: 1, score: { $meta: "searchScore" } } }
])
```

## Boosting by a Document Field

You can boost scores based on a numeric document field - for example, a popularity or rating field:

```javascript
db.products.aggregate([
  {
    $search: {
      index: "default",
      text: {
        query: "bluetooth speaker",
        path: "title",
        score: {
          boost: {
            path: "popularityScore",
            undefined: 1
          }
        }
      }
    }
  },
  { $project: { title: 1, popularityScore: 1, score: { $meta: "searchScore" } } }
])
```

The `undefined` value is the fallback if the field is missing.

## Constant Score

Replace the computed relevance score with a fixed value using `constant`. This is useful for filtering scenarios where you just want presence, not ranking:

```javascript
db.products.aggregate([
  {
    $search: {
      index: "default",
      text: {
        query: "laptop",
        path: "title",
        score: { constant: { value: 5 } }
      }
    }
  }
])
```

## Compound Scoring with Multiple Clauses

Use `compound` with `should` to combine multiple boosted sub-queries:

```javascript
db.products.aggregate([
  {
    $search: {
      index: "default",
      compound: {
        should: [
          {
            text: {
              query: "laptop",
              path: "title",
              score: { boost: { value: 4 } }
            }
          },
          {
            text: {
              query: "laptop",
              path: "tags",
              score: { boost: { value: 2 } }
            }
          }
        ]
      }
    }
  },
  { $project: { title: 1, score: { $meta: "searchScore" } } }
])
```

## Function Score

The `function` modifier lets you apply arithmetic transformations like `log1p` or `path` multiplication to the raw score:

```javascript
score: {
  function: {
    multiply: [
      { score: "relevance" },
      { log1p: { path: { value: "viewCount", undefined: 0 } } }
    ]
  }
}
```

This multiplies the relevance score by the log of viewCount plus 1, boosting popular documents without letting them completely overwhelm relevance.

## Summary

Atlas Search scoring lets you go beyond default relevance ranking by applying boost multipliers on specific fields, leveraging document-level numeric signals, or using function expressions. Start with field boost on your most important attributes, then layer in numeric boosts once you have engagement or quality signals available.
