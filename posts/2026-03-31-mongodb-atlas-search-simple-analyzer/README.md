# How to Use the Simple Analyzer in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Analyzer, Tokenizer, Full-Text Search

Description: Learn how the simple analyzer works in MongoDB Atlas Search, how it differs from the standard analyzer, and when to use it for basic case-insensitive text search.

---

## What Is the Simple Analyzer?

The simple analyzer in MongoDB Atlas Search (based on Lucene's SimpleAnalyzer) is a minimal text analysis pipeline:

1. **Tokenization** - splits text at any non-letter character using the `lowercase` tokenizer
2. **Lowercasing** - all tokens are automatically lowercased (built into the tokenizer)

Unlike the standard analyzer, it does NOT:
- Remove punctuation as separate tokens
- Handle numbers (numeric characters cause token splits, discarding the numbers)

Note: Neither the simple nor the standard analyzer removes stop words. Stop word removal requires a language-specific analyzer like `lucene.english` or a custom analyzer with an explicit stop word filter.

## Simple vs. Standard: Key Differences

```text
Input: "MongoDB 5.0 is faster than 4.4!"

Standard analyzer tokens: ["mongodb", "5.0", "is", "faster", "than", "4.4"]
Simple analyzer tokens:   ["mongodb", "is", "faster", "than"]
```

The simple analyzer discards numbers. This is its most important behavioral difference. Use the standard analyzer when numeric content matters in search results.

## Configuring an Index with the Simple Analyzer

```javascript
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "lucene.simple"
      },
      "category": {
        "type": "string",
        "analyzer": "lucene.simple"
      }
    }
  }
}
```

## Querying with the Simple Analyzer

```javascript
db.products.aggregate([
  {
    $search: {
      index: "products_search",
      text: {
        query: "Wireless Headphones",
        path: "title"
      }
    }
  },
  {
    $project: {
      title: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $sort: { score: -1 } },
  { $limit: 5 }
])
```

Since the simple analyzer lowercases both the indexed content and the query, the search for `"Wireless Headphones"` will match documents containing `"wireless headphones"`, `"WIRELESS HEADPHONES"`, or any case variation.

## When Numbers in Content Are Indexed vs. Discarded

Practical impact of the simple analyzer discarding numbers:

```text
Product title: "iPhone 15 Pro Max 256GB"
Simple tokens: ["iphone", "pro", "max", "gb"]
Standard tokens: ["iphone", "15", "pro", "max", "256gb"]
```

With the simple analyzer, searching for "15" or "256" returns no results for this document. If your search needs to match product model numbers, version strings, or codes, use the standard analyzer instead.

## Use Cases for the Simple Analyzer

The simple analyzer is best for:

- **Name fields** where numbers are not meaningful (person names, city names)
- **Category labels** and tags that contain only words
- **Simple sentence search** where you only care about word-level matching
- Scenarios where you want to avoid matching number-only queries

```javascript
{
  "mappings": {
    "fields": {
      "firstName": {
        "type": "string",
        "analyzer": "lucene.simple"
      },
      "lastName": {
        "type": "string",
        "analyzer": "lucene.simple"
      },
      "cityName": {
        "type": "string",
        "analyzer": "lucene.simple"
      }
    }
  }
}
```

## Combining Simple and Standard on Same Field

You can store a field with multiple analyzer types using a multi-field mapping:

```javascript
{
  "mappings": {
    "fields": {
      "description": [
        {
          "type": "string",
          "analyzer": "lucene.simple",
          "name": "description"
        },
        {
          "type": "string",
          "analyzer": "lucene.standard",
          "name": "description_std"
        }
      ]
    }
  }
}
```

Then target the appropriate sub-field in your query based on whether numeric matching matters.

## Checking the Analyzer Behavior

Use the Atlas Search `$searchMeta` with `explain` mode or test with controlled inserts:

```javascript
// Insert test documents
db.testSearch.insertMany([
  { title: "Product ABC-100" },
  { title: "Product 100" },
  { title: "ABC product" }
]);

// Search using simple analyzer index - "100" will NOT match
db.testSearch.aggregate([
  { $search: { index: "test_simple", text: { query: "100", path: "title" } } }
]);
// Returns 0 results (numbers are discarded by simple analyzer)
```

## Summary

The simple analyzer in MongoDB Atlas Search tokenizes text by splitting on non-letter characters and lowercasing all tokens. Its key limitation is that numeric characters cause splits - numbers are not indexed. Choose the simple analyzer for name fields, category labels, and word-only content where numeric matching is irrelevant. Use the standard analyzer when version numbers, product codes, or any numeric content needs to be searchable.
