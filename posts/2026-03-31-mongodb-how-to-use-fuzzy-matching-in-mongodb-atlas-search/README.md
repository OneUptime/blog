# How to Use Fuzzy Matching in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Fuzzy Search, Typo Tolerance

Description: Learn how to implement fuzzy matching in MongoDB Atlas Search to tolerate typos and spelling variations using Levenshtein distance with maxEdits and prefixLength options.

---

## Overview

Fuzzy matching in MongoDB Atlas Search finds documents even when search terms contain typos or spelling variations. It uses Levenshtein distance (edit distance) to measure how many single-character changes are needed to transform one string into another. For example, "laptap" has an edit distance of 1 from "laptop" (one character change), so fuzzy search with `maxEdits: 1` would still find laptop results.

## How Fuzzy Matching Works

Fuzzy matching expands the search query to include similar terms:
- Edit distance 1: one insertion, deletion, or substitution
- Edit distance 2: two such operations

```text
"laptop" -> Distance 1 variants include:
  "lapton", "lptop", "lapttop", "laptpo", etc.
```

## Basic Fuzzy Search

Add the `fuzzy` option to the `text` operator:

```javascript
db.products.aggregate([
  {
    $search: {
      text: {
        query: "laptap",   // typo for "laptop"
        path: "title",
        fuzzy: {
          maxEdits: 1      // allow 1 edit (1 or 2; omit fuzzy for exact match)
        }
      }
    }
  },
  {
    $project: {
      title: 1,
      score: { $meta: "searchScore" }
    }
  }
])
```

## Fuzzy Options Explained

```javascript
fuzzy: {
  maxEdits: 1,          // Maximum edit distance (1 or 2)
  prefixLength: 2,      // Number of leading characters that must match exactly
  maxExpansions: 50     // Max number of query term variations to consider
}
```

- `maxEdits` - higher values allow more typos but reduce precision and performance
- `prefixLength` - requires the first N characters to be exact, improving performance
- `maxExpansions` - limits the number of term variants explored (default 50)

## Controlling Precision with prefixLength

`prefixLength` is key for performance and accuracy:

```javascript
// prefixLength: 3 means "the first 3 chars must be exact"
// For query "laptop":
// - "lapton" (l-a-p exact) -> MATCH (dist=1)
// - "lptop" (l-? miss) -> NO MATCH for prefixLength=3
// - "lappot" (l-a-p exact) -> MATCH (dist=2 but maxEdits=2)

db.products.aggregate([
  {
    $search: {
      text: {
        query: "headphons",    // typo: missing "e"
        path: ["title", "description"],
        fuzzy: {
          maxEdits: 1,
          prefixLength: 4     // "head" must be exact
        }
      }
    }
  }
])
```

## Fuzzy with Autocomplete

Combine fuzzy matching with the autocomplete operator for typo-tolerant prefix search:

```javascript
db.products.aggregate([
  {
    $search: {
      autocomplete: {
        query: "wireles",   // typo: missing "s"
        path: "title",
        fuzzy: {
          maxEdits: 1,
          prefixLength: 3
        }
      }
    }
  },
  { $limit: 10 },
  { $project: { title: 1, score: { $meta: "searchScore" } } }
])
```

## Multi-Word Fuzzy Search

Fuzzy matching applies to each token in a multi-word query:

```javascript
db.products.aggregate([
  {
    $search: {
      text: {
        query: "wireles headphons",   // two typos
        path: "title",
        fuzzy: {
          maxEdits: 1,
          prefixLength: 3
        }
      }
    }
  },
  { $limit: 10 }
])
```

Each word ("wireles" and "headphons") is matched independently with the fuzzy settings.

## Combining Fuzzy with compound

Use fuzzy text search with structured filters:

```javascript
db.products.aggregate([
  {
    $search: {
      compound: {
        must: [
          {
            text: {
              query: "bluetoth headphones",  // typo in bluetooth
              path: ["title", "description"],
              fuzzy: {
                maxEdits: 2,
                prefixLength: 4
              }
            }
          }
        ],
        filter: [
          {
            range: {
              path: "price",
              gte: 50,
              lte: 300
            }
          },
          {
            equals: {
              path: "inStock",
              value: true
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      title: 1,
      price: 1,
      score: { $meta: "searchScore" }
    }
  }
])
```

## Performance Considerations

Fuzzy matching is computationally more expensive than exact matching:

```text
maxEdits: 1  - Good balance of tolerance and performance
maxEdits: 2  - More permissive but slower, can return unexpected results
(Omit the fuzzy option entirely for exact matching)

Recommendations:
- Use prefixLength: 2-4 to anchor the first chars for performance
- Use maxEdits: 1 for most cases; only use 2 for very short queries
- Use maxExpansions: 25-50 to limit variant expansion
```

## Scoring Exact vs Fuzzy Matches

Exact matches score higher than fuzzy matches automatically. You can boost exact matches further:

```javascript
db.products.aggregate([
  {
    $search: {
      compound: {
        should: [
          // Exact match with boost
          {
            text: {
              query: "laptop",
              path: "title",
              score: { boost: { value: 5 } }
            }
          },
          // Fuzzy match fallback
          {
            text: {
              query: "laptop",
              path: "title",
              fuzzy: { maxEdits: 1, prefixLength: 3 }
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
  { $sort: { score: { $meta: "searchScore" } } }
])
```

## Summary

Fuzzy matching in MongoDB Atlas Search uses Levenshtein distance to find documents despite typos and spelling errors. The `maxEdits` parameter (1 or 2) controls how many character edits are tolerated, while `prefixLength` improves performance by requiring the first N characters to match exactly. Use `maxEdits: 1` with `prefixLength: 3-4` as a good starting point for most search interfaces. Combine fuzzy matching with the `compound` operator to add structured filters without losing typo tolerance, and boost exact matches using `should` clauses to ensure perfectly spelled queries rank above fuzzy matches.
