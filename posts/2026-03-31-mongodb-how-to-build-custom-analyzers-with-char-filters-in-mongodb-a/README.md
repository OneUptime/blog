# How to Build Custom Analyzers with Char Filters in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Custom Analyzer, Char Filter, Full-Text Search

Description: Learn how to build custom analyzers using character filters in MongoDB Atlas Search to normalize and transform text before tokenization.

---

## What Are Char Filters

Character filters run before tokenization in a custom analyzer pipeline. They transform the raw text - stripping HTML, mapping characters, or applying regex replacements before the text is split into tokens.

## Custom Analyzer Structure

A custom analyzer in Atlas Search consists of:
1. Optional `charFilters` array
2. A `tokenizer`
3. Optional `tokenFilters` array

```json
{
  "name": "my_custom_analyzer",
  "charFilters": [...],
  "tokenizer": { "type": "standard" },
  "tokenFilters": [...]
}
```

## htmlStrip Char Filter

Remove HTML tags from text before indexing:

```json
{
  "name": "html_content_analyzer",
  "charFilters": [
    {
      "type": "htmlStrip",
      "ignoredTags": ["b", "i", "em", "strong"]
    }
  ],
  "tokenizer": { "type": "standard" }
}
```

## icuNormalize Char Filter

Normalize Unicode characters to a standard form:

```json
{
  "name": "unicode_analyzer",
  "charFilters": [
    {
      "type": "icuNormalize"
    }
  ],
  "tokenizer": { "type": "standard" }
}
```

## mapping Char Filter

Replace specific characters before tokenization:

```json
{
  "name": "clean_text_analyzer",
  "charFilters": [
    {
      "type": "mapping",
      "mappings": {
        "&": " and ",
        "@": " at ",
        "#": " hashtag "
      }
    }
  ],
  "tokenizer": { "type": "standard" }
}
```

## Applying the Custom Analyzer to an Index

Define the analyzer in your Atlas Search index configuration:

```json
{
  "analyzer": "lucene.standard",
  "mappings": {
    "dynamic": false,
    "fields": {
      "body": {
        "type": "string",
        "analyzer": "html_content_analyzer"
      }
    }
  },
  "analyzers": [
    {
      "name": "html_content_analyzer",
      "charFilters": [
        { "type": "htmlStrip", "ignoredTags": [] }
      ],
      "tokenizer": { "type": "standard" },
      "tokenFilters": [
        { "type": "lowercase" }
      ]
    }
  ]
}
```

## Using the Custom Analyzer in a Query

```javascript
db.articles.aggregate([
  {
    $search: {
      index: "default",
      text: {
        query: "machine learning",
        path: "body",
        fuzzy: { maxEdits: 1 }
      }
    }
  }
])
```

## Testing Your Analyzer

Use the Atlas Search `analyze` API to test your analyzer output:

```bash
curl -X POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/{groupId}/clusters/{clusterName}/fts/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "analyzer": "html_content_analyzer",
    "text": "<p>Hello <b>World</b></p>"
  }'
```

## Summary

Character filters in MongoDB Atlas Search custom analyzers transform raw text before tokenization. The `htmlStrip` filter removes markup, `mapping` replaces specific characters, and `icuNormalize` standardizes Unicode. Combine them with tokenizers and token filters to build analyzers tailored to your content type.
