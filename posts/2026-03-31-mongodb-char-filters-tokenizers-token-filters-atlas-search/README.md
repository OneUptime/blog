# How to Use Char Filters, Tokenizers, and Token Filters in Atlas Search

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Search, Tokenizer, Analyzer, Full-Text Search

Description: Learn how char filters, tokenizers, and token filters work in Atlas Search custom analyzers, with examples for each component type.

---

## The Three-Stage Analysis Pipeline

When Atlas Search indexes a text field, it passes the raw string through a pipeline:

```text
Raw Text -> [Char Filters] -> [Tokenizer] -> [Token Filters] -> Index Tokens
```

Each stage is optional except the tokenizer, which is required.

## Char Filters

Char filters transform the raw text string before tokenization.

### htmlStrip

Removes HTML tags from the input. Useful for fields that may contain user-provided HTML:

```json
{
  "charFilters": [
    { "type": "htmlStrip" }
  ]
}
```

Input: `"<p>Best <strong>laptop</strong> under $1000</p>"`
Output: `"Best laptop under $1000"`

### mapping

Replaces character sequences. Use for normalizing abbreviations or removing special characters:

```json
{
  "charFilters": [
    {
      "type": "mapping",
      "mappings": {
        "&": " and ",
        "@": " at ",
        "©": ""
      }
    }
  ]
}
```

### icuNormalize

For languages using non-ASCII scripts, normalize Unicode characters:

```json
{
  "charFilters": [
    { "type": "icuNormalize" }
  ]
}
```

## Tokenizers

The tokenizer splits the processed text into tokens.

### standard

Splits on whitespace and most punctuation. Best general-purpose tokenizer:

```json
{ "type": "standard" }
```

### whitespace

Splits only on whitespace, preserving punctuation within tokens:

```json
{ "type": "whitespace" }
```

Use for product codes like `SKU-2024-XL` that should remain as single tokens.

### nGram

Generates all n-grams of specified length. Enables substring search:

```json
{ "type": "nGram", "minGram": 2, "maxGram": 3 }
```

Input: `"cat"` with minGram=2, maxGram=3 -> `"ca"`, `"at"`, `"cat"`

### edgeGram

Generates n-grams only from the start of each token. More efficient for autocomplete:

```json
{ "type": "edgeGram", "minGram": 2, "maxGram": 10 }
```

### keyword

Treats the entire input as a single token. Equivalent to no tokenization:

```json
{ "type": "keyword" }
```

### regexSplit

Tokenizes by splitting on a regular expression:

```json
{ "type": "regexSplit", "pattern": "[,;]" }
```

## Token Filters

Token filters transform or filter the token stream after tokenization.

### lowercase

Converts all tokens to lowercase:

```json
{ "type": "lowercase" }
```

### stopword

Removes common stop words:

```json
{
  "type": "stopword",
  "tokens": ["the", "a", "an", "in", "on", "at", "to", "for"]
}
```

### porterStemming

English stemmer that reduces words to their root form:

```json
{ "type": "porterStemming" }
```

### shingle

Creates multi-word tokens for phrase-aware search:

```json
{ "type": "shingle", "minShingleSize": 2, "maxShingleSize": 3 }
```

### trim

Removes leading and trailing whitespace from tokens:

```json
{ "type": "trim" }
```

## Complete Custom Analyzer Example

```json
{
  "name": "productSearchAnalyzer",
  "charFilters": [
    { "type": "htmlStrip" },
    { "type": "mapping", "mappings": { "&": " and " } }
  ],
  "tokenizer": { "type": "standard" },
  "tokenFilters": [
    { "type": "lowercase" },
    { "type": "stopword", "tokens": ["the", "a", "an"] },
    { "type": "porterStemming" }
  ]
}
```

## Summary

Atlas Search custom analyzers chain char filters, a tokenizer, and token filters into a text processing pipeline. Char filters pre-process raw text (strip HTML, map characters), tokenizers split text into tokens (standard, whitespace, nGram, edgeGram), and token filters transform or remove tokens (lowercase, stemming, stop words). Combine these components to handle product codes, HTML content, autocomplete, and multilingual text.
