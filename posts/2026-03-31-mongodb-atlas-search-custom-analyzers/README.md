# How to Use Custom Analyzers in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Text Analysis

Description: Build custom analyzers in MongoDB Atlas Search to control tokenization, filtering, and normalization for accurate full-text search on your specific data.

---

Atlas Search ships with several built-in analyzers like `lucene.standard` and `lucene.english`, but production workloads often need custom text processing. Custom analyzers let you chain together a tokenizer with character and token filters to precisely control how text is indexed and queried.

## Anatomy of a Custom Analyzer

A custom analyzer definition has three parts:

- **charFilters** - transform the raw input string before tokenization
- **tokenizer** - split the string into tokens
- **tokenFilters** - normalize or filter the resulting tokens

```json
{
  "name": "my_custom_analyzer",
  "charFilters": [
    { "type": "htmlStrip" }
  ],
  "tokenizer": {
    "type": "standard"
  },
  "tokenFilters": [
    { "type": "lowercase" },
    {
      "type": "stopword",
      "tokens": ["the", "a", "an", "is", "in"]
    },
    {
      "type": "snowballStemming",
      "stemmerName": "english"
    }
  ]
}
```

## Defining a Custom Analyzer in Your Index

Add the analyzer definition under `analyzers` in the index definition, then reference it in a field mapping:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "description": {
        "type": "string",
        "analyzer": "my_product_analyzer"
      }
    }
  },
  "analyzers": [
    {
      "name": "my_product_analyzer",
      "charFilters": [],
      "tokenizer": { "type": "whitespace" },
      "tokenFilters": [
        { "type": "lowercase" },
        { "type": "trim" },
        {
          "type": "shingle",
          "minShingleSize": 2,
          "maxShingleSize": 3
        }
      ]
    }
  ]
}
```

## Useful Token Filters

**Length filter** - drop tokens outside a character range, removing noise:

```json
{ "type": "length", "min": 3, "max": 30 }
```

**Pattern replace** - strip non-alphanumeric characters from tokens:

```json
{
  "type": "regex",
  "pattern": "[^a-zA-Z0-9]",
  "replacement": "",
  "matches": "all"
}
```

**nGram** - break tokens into character n-grams for partial matching:

```json
{
  "type": "nGram",
  "minGram": 3,
  "maxGram": 5
}
```

## Using a Custom Analyzer at Query Time

You can also specify a custom analyzer for the query string using `searchAnalyzer`. If you omit it, Atlas Search uses the same analyzer as the index:

```javascript
db.products.aggregate([
  {
    $search: {
      index: "product_search",
      text: {
        query: "wireless noise cancelling",
        path: "description",
        fuzzy: {}
      }
    }
  }
])
```

## Testing Your Analyzer

Use the Search Tester or the "View text analysis" panel in the Atlas UI Visual Editor to test how a string is analyzed before committing to an index definition. This prevents surprises where tokens don't match because of unexpected stemming or stop-word removal.

## Multi-Analyzer Fields

Assign different analyzers to the same field for different query strategies:

```json
{
  "description": {
    "type": "string",
    "analyzer": "lucene.standard",
    "multi": {
      "exact": {
        "type": "string",
        "analyzer": "lucene.keyword"
      }
    }
  }
}
```

Query `description` for relevance-ranked results, and `description.exact` for exact-phrase matching.

## Summary

Custom analyzers in Atlas Search give you precise control over how text is processed at index and query time. Start with a tokenizer that matches your content structure, apply lowercase and stop-word filters, and layer in stemming or n-gram filters for the search experience your users expect. Test each change in the Atlas UI before rebuilding the index.
