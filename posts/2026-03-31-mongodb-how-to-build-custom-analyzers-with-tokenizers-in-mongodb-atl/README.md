# How to Build Custom Analyzers with Tokenizers in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Custom Analyzer, Tokenizer, Full-Text Search

Description: Learn how to choose and configure tokenizers in MongoDB Atlas Search custom analyzers to control how text is split into searchable tokens.

---

## What Is a Tokenizer

A tokenizer splits input text into individual tokens (terms) that are indexed for search. The choice of tokenizer fundamentally changes what search queries will match.

## Available Tokenizers in Atlas Search

Atlas Search supports several tokenizer types:
- `standard` - splits on whitespace and punctuation
- `whitespace` - splits only on whitespace
- `nGram` - generates all n-grams of specified length
- `edgeGram` - generates n-grams from the start of each token
- `keyword` - treats the entire input as a single token
- `regexCaptureGroup` - extracts tokens via regex capture group
- `regexSplit` - splits tokens using a regex delimiter
- `uaxUrlEmail` - tokenizes URLs and email addresses as single tokens

## Standard Tokenizer

Best for general English-language content:

```json
{
  "name": "standard_analyzer",
  "tokenizer": {
    "type": "standard",
    "maxTokenLength": 255
  }
}
```

## Edge N-Gram Tokenizer for Autocomplete

Generates prefix tokens for autocomplete functionality:

```json
{
  "name": "autocomplete_analyzer",
  "tokenizer": {
    "type": "edgeGram",
    "minGram": 2,
    "maxGram": 15
  }
}
```

## N-Gram Tokenizer for Substring Search

Enables matching at any position within a word:

```json
{
  "name": "substring_analyzer",
  "tokenizer": {
    "type": "nGram",
    "minGram": 3,
    "maxGram": 5
  }
}
```

## Keyword Tokenizer for Exact Match

Treat the whole field value as one token:

```json
{
  "name": "exact_analyzer",
  "tokenizer": {
    "type": "keyword"
  }
}
```

## Regex Tokenizer for Structured Text

Extract tokens from structured formats like log lines:

```json
{
  "name": "log_analyzer",
  "tokenizer": {
    "type": "regexSplit",
    "pattern": "[\\s,;|]+"
  }
}
```

## Full Index Configuration with Custom Tokenizer

```json
{
  "analyzers": [
    {
      "name": "product_search_analyzer",
      "tokenizer": {
        "type": "edgeGram",
        "minGram": 2,
        "maxGram": 20
      },
      "tokenFilters": [
        { "type": "lowercase" },
        { "type": "trim" }
      ]
    }
  ],
  "mappings": {
    "fields": {
      "productName": {
        "type": "string",
        "analyzer": "product_search_analyzer",
        "searchAnalyzer": "lucene.standard"
      }
    }
  }
}
```

Using different analyzers for indexing and search is common with n-gram tokenizers: index with n-grams but search with standard to avoid overly broad matching.

## Querying with the Custom Analyzer

```javascript
db.products.aggregate([
  {
    $search: {
      text: {
        query: "wid",
        path: "productName"
      }
    }
  },
  { $limit: 10 },
  { $project: { productName: 1, _id: 0 } }
])
```

## Summary

Tokenizers determine how text is split into searchable tokens in Atlas Search custom analyzers. Use `edgeGram` for prefix autocomplete, `nGram` for substring matching, `standard` for general text, and `keyword` for exact-match scenarios. Pair with `searchAnalyzer` to use a different analyzer at query time than at index time.
