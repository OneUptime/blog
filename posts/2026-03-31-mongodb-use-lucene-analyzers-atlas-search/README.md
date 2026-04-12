# How to Use Lucene Analyzers with Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Lucene, Analyzer, Full-Text Search

Description: Learn how to use built-in Lucene analyzers in Atlas Search to improve full-text search quality for different languages, use cases, and matching requirements.

---

## What Is an Analyzer?

An analyzer processes text during indexing and querying. It tokenizes the input, applies filters (lowercase, stop words, stemming), and produces tokens stored in the search index. Choosing the right analyzer determines whether "Running" matches "run" and whether "the" is ignored.

Atlas Search ships with several built-in Lucene analyzers that cover the most common scenarios without writing custom code.

## Built-in Lucene Analyzers

### lucene.standard

The default analyzer. Tokenizes on word boundaries using Unicode text segmentation and lowercases tokens. It does not remove stop words.

```json
{
  "mappings": {
    "fields": {
      "description": {
        "type": "string",
        "analyzer": "lucene.standard"
      }
    }
  }
}
```

Best for general-purpose text search across multiple languages where no language-specific stemming or stop word removal is needed.

### lucene.english

Builds on standard but adds stemming for English. "Running", "runs", and "ran" all reduce to the stem "run".

```json
"body": {
  "type": "string",
  "analyzer": "lucene.english"
}
```

Use for blog posts, product descriptions, and documentation.

### lucene.keyword

Treats the entire field value as a single token. No lowercasing, no tokenization.

```json
"sku": {
  "type": "string",
  "analyzer": "lucene.keyword"
}
```

Use for exact-match fields like SKU codes, email addresses, and enum values.

### Language-Specific Analyzers

Atlas Search includes analyzers for many languages:

```text
lucene.french     - French with stemming and elision
lucene.german     - German with stemming
lucene.spanish    - Spanish with stemming
lucene.portuguese - Portuguese with stemming
lucene.italian    - Italian with stemming
lucene.arabic     - Arabic with normalization
lucene.chinese    - Chinese with CJK tokenization
lucene.japanese   - Japanese with kuromoji tokenizer
```

Example for a multilingual site:

```json
{
  "mappings": {
    "fields": {
      "title_en": { "type": "string", "analyzer": "lucene.english" },
      "title_fr": { "type": "string", "analyzer": "lucene.french" },
      "title_de": { "type": "string", "analyzer": "lucene.german" }
    }
  }
}
```

### lucene.whitespace

Tokenizes only on whitespace. Preserves punctuation within tokens and does not lowercase.

```json
"hashtags": {
  "type": "string",
  "analyzer": "lucene.whitespace"
}
```

### lucene.simple

Lowercases and tokenizes on any non-letter character. Aggressive tokenization that splits on digits and punctuation.

## Using Different Analyzers for Index and Query

You can index with one analyzer and query with a different one using `searchAnalyzer`:

```json
"autocomplete_field": {
  "type": "string",
  "analyzer": "lucene.standard",
  "searchAnalyzer": "lucene.keyword"
}
```

This is useful for autocomplete where you index with edge n-grams but query with exact input.

## Querying with Analyzer Awareness

```javascript
db.products.aggregate([
  { $search: {
    index: "product-search",
    text: {
      query: "running shoes",
      path: "description",
      // Atlas Search uses the field's configured analyzer automatically
      fuzzy: { maxEdits: 1 }
    }
  }}
]);
```

## Testing Analyzers

Use the Atlas UI's Analyze page or the `$searchMeta` stage with the `count` operator to verify indexed token counts after changing analyzers.

## Summary

Built-in Lucene analyzers in Atlas Search cover most text search needs without custom configuration. Use `lucene.english` for English prose with stemming, `lucene.keyword` for exact-match identifier fields, language-specific analyzers for multilingual content, and `lucene.whitespace` when token boundaries should only split on spaces. Assign analyzers per field in the index definition's `"fields"` section and optionally specify a different `searchAnalyzer` for query-time processing.
