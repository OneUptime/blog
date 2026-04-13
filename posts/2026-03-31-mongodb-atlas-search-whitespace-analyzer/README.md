# How to Use the Whitespace Analyzer in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Analyzer, Tokenizer, Full-Text Search

Description: Learn how the whitespace analyzer works in MongoDB Atlas Search, its case-sensitive token splitting behavior, and when to use it over the standard or simple analyzer.

---

## What Is the Whitespace Analyzer?

The whitespace analyzer in MongoDB Atlas Search (based on Lucene's WhitespaceAnalyzer) uses a single step:

1. **Tokenization** - splits text only on whitespace characters (spaces, tabs, newlines)

It does NOT lowercase tokens, does NOT split on punctuation, and performs no stop word removal. Tokens are produced exactly as they appear in the source text.

## Whitespace vs. Standard vs. Simple: Key Differences

```text
Input: "New York, NY - 10001"

Whitespace analyzer tokens: ["New", "York,", "NY", "-", "10001"]
Simple analyzer tokens:     ["new", "york", "ny"]  (discards numbers like "10001")
Standard analyzer tokens:   ["new", "york", "ny", "10001"]
```

Notice: the whitespace analyzer keeps `"York,"` (with comma) and `"-"` as tokens. This preserves punctuation as part of tokens, which can be useful or problematic depending on your use case.

## When to Use the Whitespace Analyzer

The whitespace analyzer is appropriate for:

- **Code search** where punctuation and case are significant (`List<String>`, `$inc`)
- **Tag or label fields** with space-separated values that are case-sensitive
- **Log search** where tokens like `ERROR:` or `[INFO]` must match exactly
- Fields where you control the exact token format at write time

## Configuring an Index with the Whitespace Analyzer

```javascript
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "logLine": {
        "type": "string",
        "analyzer": "lucene.whitespace"
      },
      "codeSnippet": {
        "type": "string",
        "analyzer": "lucene.whitespace"
      }
    }
  }
}
```

## Querying with the Whitespace Analyzer

```javascript
db.logs.aggregate([
  {
    $search: {
      index: "logs_search",
      text: {
        query: "ERROR: Connection",
        path: "logLine"
      }
    }
  },
  { $limit: 20 },
  { $project: { logLine: 1, score: { $meta: "searchScore" } } }
])
```

The query `"ERROR: Connection"` produces tokens `["ERROR:", "Connection"]` (whitespace split, case preserved). This matches documents containing exactly `"ERROR:"` and `"Connection"` in that form. A document with `"error: connection"` (lowercase) would NOT match.

## Case Sensitivity Is a Double-Edged Sword

```javascript
// Insert log entries
db.logs.insertMany([
  { logLine: "ERROR: Connection refused to host db01" },
  { logLine: "error: connection refused to host db01" },
  { logLine: "WARN: Slow query detected" }
]);

// Search for "ERROR:" - only matches the first document
db.logs.aggregate([
  { $search: { index: "logs_search", text: { query: "ERROR:", path: "logLine" } } }
]);
// Returns only the first document
```

If case-insensitive matching is needed with whitespace tokenization, build a custom analyzer combining the whitespace tokenizer with a lowercase token filter.

## Custom Analyzer: Whitespace + Lowercase

When you want whitespace splitting but case-insensitive matching:

```javascript
{
  "analyzers": [
    {
      "name": "whitespace_lowercase",
      "tokenizer": { "type": "whitespace" },
      "tokenFilters": [{ "type": "lowercase" }]
    }
  ],
  "mappings": {
    "fields": {
      "tags": {
        "type": "string",
        "analyzer": "whitespace_lowercase"
      }
    }
  }
}
```

## Practical Example: Searching Hashtags

Hashtags and special tokens work well with the whitespace analyzer since punctuation is preserved:

```javascript
// Documents with tags stored as space-separated strings
{ tags: "#mongodb #database #nosql" }

// Whitespace tokens: ["#mongodb", "#database", "#nosql"]
// Search for exact hashtag
db.posts.aggregate([
  { $search: { index: "posts_search", text: { query: "#mongodb", path: "tags" } } }
]);
```

This correctly finds posts tagged with `#mongodb` without accidentally matching posts tagged `#mongodbatlas`.

## Summary

The whitespace analyzer in MongoDB Atlas Search splits text only on whitespace, preserves case and punctuation in tokens, and performs no other transformations. It is ideal for code search, log analysis, and case-sensitive tag matching. Its case sensitivity is a feature for technical content but a drawback for user-facing search. When you need whitespace tokenization with case-insensitive matching, build a custom analyzer combining the whitespace tokenizer with a lowercase token filter.
