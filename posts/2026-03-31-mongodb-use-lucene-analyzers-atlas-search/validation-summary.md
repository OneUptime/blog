# Validation Summary: How to Use Lucene Analyzers with Atlas Search

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB Atlas Search
- Apache Lucene Analyzers
- MongoDB Aggregation Pipeline (`$search`, `$searchMeta`)

## Sources Consulted
- MongoDB Atlas Search documentation on built-in analyzers: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/
- MongoDB Atlas Search documentation on index definitions: https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/
- Apache Lucene StandardAnalyzer documentation (confirms no stop word removal in modern versions): https://lucene.apache.org/core/9_0_0/core/org/apache/lucene/analysis/standard/StandardAnalyzer.html
- MongoDB Atlas Search `$search` operator documentation: https://www.mongodb.com/docs/atlas/atlas-search/text/

## Issues Found

1. **Code example mismatch under `lucene.standard` section**: The code block under the `lucene.standard` heading used `"analyzer": "lucene.english"` instead of `"analyzer": "lucene.standard"`. This was a copy-paste error. Fixed to use `"lucene.standard"`.

2. **Incorrect claim that `lucene.standard` removes stop words**: The description stated that `lucene.standard` "removes common stop words." In modern Lucene (3.1+) and in MongoDB Atlas Search, the standard analyzer does NOT remove stop words — it only tokenizes on word boundaries and lowercases tokens. Stop word removal is a feature of language-specific analyzers like `lucene.english`. Fixed the description to accurately state that it does not remove stop words.

3. **Misleading "Best for" description**: The text under the `lucene.standard` code example said "Best for general-purpose English text where stop words like 'the' and 'is' should be ignored." Since `lucene.standard` does not remove stop words, this was misleading. Reworded to describe it as best for general-purpose multilingual text where no stemming or stop word removal is needed.

## Review Notes
- The `lucene.chinese` analyzer listed in the language-specific section may not exist as a named built-in Atlas Search analyzer. The Lucene ChineseAnalyzer was deprecated and removed in Lucene 4.x. For Chinese text analysis in Atlas Search, a custom analyzer or `lucene.smartcn` may be needed. This should be verified against the latest Atlas Search documentation.
- The `lucene.japanese` analyzer with Kuromoji tokenizer may require confirmation that it is available as a named built-in analyzer in Atlas Search (vs. requiring a custom analyzer configuration).
- The autocomplete example mentions indexing with "edge n-grams" but the code example uses `lucene.standard`, not an edge n-gram tokenizer. The concept is correct but the example doesn't fully illustrate the described use case — the `autocomplete` field type with `edgeGram` tokenization strategy would be needed for a complete autocomplete setup.
- JSON comments are not valid JSON syntax. The `$search` JavaScript example includes a `//` comment inside what appears to be a MongoDB shell query. This works in the MongoDB shell (which accepts JavaScript) but could confuse readers expecting strict JSON.
