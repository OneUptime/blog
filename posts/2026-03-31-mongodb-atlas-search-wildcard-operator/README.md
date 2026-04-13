# How to Use the wildcard Operator in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Wildcard, Pattern Matching, Atlas

Description: Learn how to use the Atlas Search wildcard operator with ? and * patterns for flexible string matching on indexed fields in MongoDB.

---

The `wildcard` operator in MongoDB Atlas Search performs pattern-based string matching using `?` (single character) and `*` (zero or more characters) wildcards. It is ideal for prefix searches, suffix searches, and simple glob-style patterns on keyword-indexed fields.

## Wildcard Characters

| Character | Meaning |
|-----------|---------|
| `*` | Matches zero or more characters |
| `?` | Matches exactly one character |
| `\\` | Escapes a literal `*` or `?` |

## Basic Wildcard Search

Find all products with names starting with "pro":

```javascript
db.products.aggregate([
  {
    $search: {
      wildcard: {
        query: "pro*",
        path: "name"
      }
    }
  },
  {
    $project: {
      name: 1
    }
  }
])
```

## Suffix Matching

Find files ending in ".pdf":

```javascript
db.files.aggregate([
  {
    $search: {
      wildcard: {
        query: "*.pdf",
        path: "filename"
      }
    }
  },
  {
    $project: {
      filename: 1,
      size: 1
    }
  }
])
```

## Single Character Wildcard

Match color codes like "red1", "red2", "red3":

```javascript
db.products.aggregate([
  {
    $search: {
      wildcard: {
        query: "red?",
        path: "colorCode"
      }
    }
  }
])
```

## Case-Insensitive Wildcard

By default, `wildcard` is case-sensitive. For case-insensitive matching, define a custom analyzer that combines a `keyword` tokenizer with a `lowercase` token filter in your index definition:

```json
{
  "analyzers": [
    {
      "name": "lowercaseKeyword",
      "charFilters": [],
      "tokenizer": {
        "type": "keyword"
      },
      "tokenFilters": [
        {
          "type": "lowercase"
        }
      ]
    }
  ],
  "mappings": {
    "fields": {
      "name": {
        "type": "string",
        "analyzer": "lowercaseKeyword"
      }
    }
  }
}
```

Then query with a lowercase pattern and `allowAnalyzedField: true`:

```javascript
db.products.aggregate([
  {
    $search: {
      wildcard: {
        query: "laptop*",
        path: "name",
        allowAnalyzedField: true
      }
    }
  }
])
```

## Combining wildcard with compound

Use wildcard as a filter inside `compound` to restrict results without affecting relevance scores:

```javascript
db.documents.aggregate([
  {
    $search: {
      compound: {
        must: [
          {
            text: {
              query: "quarterly report",
              path: "content"
            }
          }
        ],
        filter: [
          {
            wildcard: {
              query: "2026-Q?-*",
              path: "filename"
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      filename: 1,
      score: { $meta: "searchScore" }
    }
  }
])
```

## Searching Multiple Fields

Apply the same wildcard pattern across several fields:

```javascript
db.products.aggregate([
  {
    $search: {
      wildcard: {
        query: "acme-*",
        path: ["sku", "partNumber", "modelCode"]
      }
    }
  }
])
```

## wildcard vs regex

```text
Operator  | Pattern syntax | Performance  | Best for
----------|---------------|--------------|-----------------------------
wildcard  | * and ?       | Faster       | Simple prefix/suffix patterns
regex     | Full regex    | Slower       | Complex patterns, character classes
```

## Summary

The `wildcard` operator provides flexible glob-style matching for Atlas Search using `*` and `?` characters. It is faster than `regex` for simple prefix and suffix patterns. Always index fields with the `keyword` analyzer for reliable wildcard matching, and use it inside `compound` filter clauses when combining with text search queries.

