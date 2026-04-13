# How to Build Custom Analyzers with Token Filters in MongoDB Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Custom Analyzer, Token Filter, Full-Text Search

Description: Learn how to configure token filters in MongoDB Atlas Search custom analyzers to normalize, remove, and transform tokens after tokenization.

---

## What Are Token Filters

Token filters run after the tokenizer and modify individual tokens. They can lowercase text, remove stop words, apply stemming, strip accents, or filter tokens by length.

## Lowercase Filter

Convert all tokens to lowercase for case-insensitive search:

```json
{
  "name": "case_insensitive_analyzer",
  "tokenizer": { "type": "standard" },
  "tokenFilters": [
    { "type": "lowercase" }
  ]
}
```

## Stop Word Filter

Remove common words that add noise to search:

```json
{
  "tokenFilters": [
    {
      "type": "stopword",
      "tokens": ["the", "a", "an", "and", "or", "but", "in", "on", "at"],
      "ignoreCase": true
    }
  ]
}
```

## Stemming with Language-Specific Filters

Reduce words to their root form:

```json
{
  "tokenFilters": [
    { "type": "lowercase" },
    {
      "type": "porterStemming"
    }
  ]
}
```

For English with English-specific stemming:

```json
{
  "type": "snowballStemming",
  "stemmerName": "english"
}
```

## Length Filter

Remove tokens that are too short or too long:

```json
{
  "tokenFilters": [
    {
      "type": "length",
      "min": 3,
      "max": 30
    }
  ]
}
```

## Accent Removal (icuFolding)

Normalize accented characters to their ASCII equivalents:

```json
{
  "tokenFilters": [
    { "type": "icuFolding" }
  ]
}
```

This maps `café` to `cafe` and `naïf` to `naif`, enabling accent-insensitive search.

## Combining Multiple Token Filters

A practical multi-filter analyzer for e-commerce product search:

```json
{
  "name": "product_analyzer",
  "charFilters": [
    { "type": "htmlStrip" }
  ],
  "tokenizer": {
    "type": "standard",
    "maxTokenLength": 50
  },
  "tokenFilters": [
    { "type": "lowercase" },
    { "type": "icuFolding" },
    {
      "type": "stopword",
      "tokens": ["the", "a", "an", "with", "for", "and"]
    },
    {
      "type": "length",
      "min": 2,
      "max": 40
    },
    { "type": "trim" }
  ]
}
```

## Shingling for Phrase Detection

Generate multi-token shingles to improve phrase-based scoring:

```json
{
  "type": "shingle",
  "minShingleSize": 2,
  "maxShingleSize": 3
}
```

## Using the Analyzer in a Search Query

```javascript
db.products.aggregate([
  {
    $search: {
      index: "products_index",
      text: {
        query: "running shoes waterproof",
        path: "description"
      }
    }
  },
  {
    $project: {
      name: 1,
      score: { $meta: "searchScore" }
    }
  },
  { $sort: { score: -1 } },
  { $limit: 10 }
])
```

## Summary

Token filters in MongoDB Atlas Search custom analyzers post-process tokens to normalize text. Combine lowercase for case insensitivity, stop word removal for cleaner indexes, stemming for root-based matching, and `icuFolding` for accent-insensitive search. The order of filters matters - always lowercase before stemming.
