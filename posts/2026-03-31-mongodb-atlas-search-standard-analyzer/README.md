# How to Use the Standard Analyzer in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Analyzer, Full-Text Search, Lucene

Description: Learn how the standard analyzer works in MongoDB Atlas Search, when to use it, and how to configure index mappings that leverage its tokenization and filtering pipeline.

---

## What Is the Standard Analyzer?

The standard analyzer is the default text analysis pipeline in MongoDB Atlas Search. It is based on the Lucene StandardAnalyzer and performs two operations in sequence:

1. **Tokenization** - splits text on word boundaries using the `standard` tokenizer (based on the Unicode Text Segmentation algorithm)
2. **Lowercasing** - converts all tokens to lowercase with the `lowercase` token filter

The result is a set of normalized, lowercase tokens suitable for case-insensitive full-text search. Note that unlike the raw Lucene StandardAnalyzer, the Atlas Search `lucene.standard` analyzer does not include stop word removal. If you need stop words filtered, create a custom analyzer with a stop word token filter.

## Creating an Atlas Search Index with the Standard Analyzer

```javascript
// Using the Atlas Search index definition (JSON format)
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "title": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "body": {
        "type": "string",
        "analyzer": "lucene.standard"
      },
      "author": {
        "type": "string",
        "analyzer": "lucene.keyword"  // exact match for author names
      }
    }
  }
}
```

Apply via the Atlas UI, the `atlas` CLI, or the Admin API. The `lucene.standard` identifier is how you reference the standard analyzer in Atlas Search index definitions.

## Querying with the Standard Analyzer

A basic text search using the standard analyzer:

```javascript
db.articles.aggregate([
  {
    $search: {
      index: "articles_search",
      text: {
        query: "MongoDB Atlas Search full-text",
        path: ["title", "body"]
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
  { $limit: 10 }
])
```

The query `"MongoDB Atlas Search full-text"` is analyzed with the same standard analyzer, producing tokens: `mongodb`, `atlas`, `search`, `full`, `text`. Documents containing any of these tokens are ranked by relevance.

## Understanding What the Standard Analyzer Does to Text

```text
Input:  "MongoDB's Atlas Search is AMAZING!"

After standard tokenizer:
Tokens: ["MongoDB's", "Atlas", "Search", "is", "AMAZING"]

After lowercase filter:
Tokens: ["mongodb's", "atlas", "search", "is", "amazing"]

Note: The standard tokenizer preserves original casing — lowercasing
happens in the next pipeline step. "MongoDB's" is kept as a single
token (apostrophe handling varies by Lucene version).
```

You can inspect how the analyzer processes your query by running the search and examining the score. For deeper analysis, use `db.collection.explain().aggregate(...)` with your `$search` pipeline:

```javascript
db.articles.explain().aggregate([
  {
    $search: {
      index: "articles_search",
      text: { query: "MongoDB's Atlas", path: "title" }
    }
  },
  { $limit: 1 },
  { $project: { searchScore: { $meta: "searchScore" } } }
])
```

## Multi-Analyzer Field Mapping

Index the same field with multiple analyzers to support both standard search and exact-match scenarios:

```javascript
{
  "mappings": {
    "fields": {
      "title": [
        {
          "type": "string",
          "analyzer": "lucene.standard",
          "name": "title"
        },
        {
          "type": "string",
          "analyzer": "lucene.keyword",
          "name": "title.keyword"
        }
      ]
    }
  }
}
```

## Phrase Search with Standard Analyzer

The standard analyzer supports phrase queries, which require tokens to appear adjacent in the document:

```javascript
{
  $search: {
    index: "articles_search",
    phrase: {
      query: "full text search",
      path: "body",
      slop: 1   // tokens can be 1 position apart
    }
  }
}
```

## When to Choose the Standard Analyzer

```text
Use standard analyzer when:
- Content is in English or mixed language
- Users expect case-insensitive search
- Partial word matching is NOT required (use nGram for that)
- Phrase and proximity searches matter

Consider alternatives when:
- Exact case-sensitive matching needed  -> lucene.keyword
- Autocomplete prefix matching needed  -> use edge nGram tokenizer
- Language-specific stemming needed    -> lucene.english or language analyzers
```

## Summary

The standard analyzer in MongoDB Atlas Search is the best default choice for English full-text search. It tokenizes on whitespace and punctuation, lowercases all tokens, and produces a clean token stream for relevance-ranked queries. Specify it with `"analyzer": "lucene.standard"` in your index mapping. It handles most general-purpose search use cases well - reach for language-specific or custom analyzers only when you need stemming, stop word lists, or special tokenization rules.
