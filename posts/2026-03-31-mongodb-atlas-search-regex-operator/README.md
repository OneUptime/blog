# How to Use the regex Operator in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Regex, Pattern Matching, Atlas

Description: Learn how to use the Atlas Search regex operator to match documents using regular expression patterns on indexed string fields.

---

The `regex` operator in MongoDB Atlas Search applies regular expression pattern matching to string fields in the search index. Unlike MongoDB's `$regex` query operator, Atlas Search `regex` runs on the Lucene index and uses Lucene regular expression syntax.

## Requirements

- The field must be indexed as `string` type with the `keyword` or `standard` analyzer
- For the best regex performance, use the `keyword` analyzer (stores the whole value as a single token)
- `regex` is case-sensitive by default

## Basic Regex Query

Match products with SKUs starting with "ELEC":

```javascript
db.products.aggregate([
  {
    $search: {
      index: "default",
      regex: {
        query: "ELEC.*",
        path: "sku"
      }
    }
  },
  {
    $project: {
      name: 1,
      sku: 1
    }
  }
])
```

## Case-Insensitive Matching

Use `allowAnalyzedField` to run regex against fields indexed with an analyzer that lowercases tokens, such as `lucene.standard`:

```javascript
db.products.aggregate([
  {
    $search: {
      regex: {
        query: "laptop.*",
        path: "name",
        allowAnalyzedField: true
      }
    }
  }
])
```

When the field uses the `lucene.standard` analyzer, tokens are lowercased. Use a lowercase pattern to match regardless of the original case. Note that with an analyzed field, the regex matches against individual tokens, not the entire field value.

## Matching Email Patterns

Find users with Gmail addresses:

```javascript
db.users.aggregate([
  {
    $search: {
      regex: {
        query: ".*@gmail\\.com",
        path: "email"
      }
    }
  },
  {
    $project: {
      name: 1,
      email: 1
    }
  }
])
```

Note: Escape dots with `\\.` in the JSON string.

## Matching Partial SKUs or Codes

Find order numbers between 1000 and 1999:

```javascript
db.orders.aggregate([
  {
    $search: {
      regex: {
        query: "ORD-1[0-9]{3}",
        path: "orderNumber"
      }
    }
  }
])
```

## Combining regex with compound

Use `regex` as a `filter` inside `compound` to restrict results without affecting text search scores:

```javascript
db.products.aggregate([
  {
    $search: {
      compound: {
        must: [
          {
            text: {
              query: "gaming mouse",
              path: ["name", "description"]
            }
          }
        ],
        filter: [
          {
            regex: {
              query: "SKU-[A-Z]{3}-[0-9]+",
              path: "sku"
            }
          }
        ]
      }
    }
  },
  {
    $project: {
      name: 1,
      sku: 1,
      score: { $meta: "searchScore" }
    }
  }
])
```

## Index Configuration for regex

For reliable regex matching, index the field with the `keyword` analyzer to preserve the full string as one token:

```json
{
  "mappings": {
    "fields": {
      "sku": {
        "type": "string",
        "analyzer": "lucene.keyword"
      },
      "email": {
        "type": "string",
        "analyzer": "lucene.keyword"
      }
    }
  }
}
```

## Performance Considerations

```text
- Leading wildcards (.*pattern) are expensive - avoid when possible
- Patterns are implicitly anchored to match the entire token - no need for ^ or $
- regex does not use term statistics for scoring - all matches get the same score
- For simple prefix matching, the wildcard operator is more efficient
```

## Summary

The Atlas Search `regex` operator enables pattern-based string matching using Java-compatible regular expressions. It works best on keyword-analyzed fields where the entire string is stored as one token. Use it for structured patterns like SKUs, codes, or email formats, and combine it with `compound` filters to blend regex matching with full-text relevance scoring.

