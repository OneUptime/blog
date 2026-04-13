# How to Use the phrase Operator for Exact Phrase Matching in Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Phrase, Full-Text Search, Atlas

Description: Learn how to use the Atlas Search phrase operator to match exact sequences of words with optional slop for near-phrase matching in MongoDB.

---

The `phrase` operator in MongoDB Atlas Search matches documents where the specified words appear in the exact order you define. Unlike the `text` operator which matches any occurrence of the words, `phrase` requires them to appear as a consecutive sequence.

## Basic Phrase Query

Match documents containing the exact phrase "organic coffee beans":

```javascript
db.products.aggregate([
  {
    $search: {
      index: "default",
      phrase: {
        query: "organic coffee beans",
        path: "description"
      }
    }
  },
  {
    $project: {
      name: 1,
      description: 1,
      score: { $meta: "searchScore" }
    }
  }
])
```

This matches "I love organic coffee beans" but not "organic roasted coffee beans" (words are not consecutive).

## Searching Multiple Fields

Search across several fields for the same phrase:

```javascript
db.articles.aggregate([
  {
    $search: {
      phrase: {
        query: "machine learning",
        path: ["title", "body", "summary"]
      }
    }
  }
])
```

## Using slop for Near-Phrase Matching

The `slop` parameter allows words to be slightly out of order or have words between them. A slop of 1 means one extra word is allowed between the phrase words:

```javascript
db.articles.aggregate([
  {
    $search: {
      phrase: {
        query: "quick brown fox",
        path: "content",
        slop: 2
      }
    }
  }
])
```

With `slop: 2`, this matches:
- "quick brown fox" (exact)
- "quick little brown fox" (one word inserted)
- "quick little agile brown fox" (two words inserted)

## Multiple Phrases in a Compound Query

Combine phrase with other operators using `compound`:

```javascript
db.products.aggregate([
  {
    $search: {
      compound: {
        must: [
          {
            phrase: {
              query: "stainless steel",
              path: "materials"
            }
          }
        ],
        should: [
          {
            phrase: {
              query: "dishwasher safe",
              path: "features"
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      name: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $sort: { score: -1 } }
])
```

## Phrase with Score Boost

Use `score` to boost documents where the phrase appears in the title:

```javascript
db.articles.aggregate([
  {
    $search: {
      compound: {
        should: [
          {
            phrase: {
              query: "climate change",
              path: "title",
              score: { boost: { value: 3 } }
            }
          },
          {
            phrase: {
              query: "climate change",
              path: "body"
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      title: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $sort: { score: -1 } }
])
```

## Difference Between text and phrase

```text
Operator | Query: "fast car"         | Matches
---------|--------------------------|---------------------------
text     | "fast car"               | "fast red car", "car fast"
phrase   | "fast car"               | "fast car" only
phrase   | slop: 1, "fast car"      | "fast shiny car"
```

## Summary

The `phrase` operator provides exact sequence matching in Atlas Search, making it ideal for product names, legal terms, or technical phrases where word order matters. The `slop` parameter adds flexibility by permitting a defined number of words between phrase terms.

