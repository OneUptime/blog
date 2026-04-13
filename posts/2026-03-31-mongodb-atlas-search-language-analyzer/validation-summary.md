# Validation Summary: How to Use the Language Analyzer in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Search
- Lucene language analyzers (English, German, French, etc.)
- Snowball/Porter stemming algorithm
- MongoDB aggregation pipeline ($search stage)

## Sources Consulted
- MongoDB Atlas Search documentation: Analyzers — Built-in Analyzers (https://www.mongodb.com/docs/atlas/atlas-search/analyzers/built-in/)
- MongoDB Atlas Search documentation: Define Field Mappings — multi analyzer (https://www.mongodb.com/docs/atlas/atlas-search/define-field-mappings/#std-label-fts-field-mappings-multi)
- Apache Lucene EnglishAnalyzer source and Snowball/Porter2 stemmer specification
- Lucene deprecation history for ChineseAnalyzer (removed in Lucene 4.0)

## Issues Found

1. **Incorrect stemming claim for "runner" (line 20):** The post claimed stemming "running" would also match "runner". The Porter/Snowball stemmer reduces "running" to "run" but "runner" remains "runner" (the `-er` suffix is not stripped by the algorithm). Changed the example to use "studied" matching "study" instead, which correctly demonstrates stemming behavior.

2. **Invalid analyzer `lucene.chinese` (line 28):** The Lucene `ChineseAnalyzer` was deprecated in Lucene 3.1 and removed in Lucene 4.0. It does not exist in Atlas Search. Removed `lucene.chinese` from the list and added `lucene.smartcn`, which is the actual Chinese text analyzer available in Atlas Search.

3. **Phantom stop word "and" in analysis example (line 71):** The parenthetical note claimed stop words "the", "are", and "and" were removed, but the word "and" does not appear in the input sentence. Fixed to accurately state that "the" and "are" were removed.

4. **Incorrect multi-analyzer field definition syntax (lines 157-175):** The post used an array syntax with a `name` property to define alternate analyzers on the same field. This is not the documented approach. Atlas Search uses the `multi` property within a field definition for alternate analyzers. Fixed to use the correct `multi` syntax, which produces the `title.exact` path for the keyword analyzer.

## Review Notes
- The list of supported language analyzers may be incomplete for the latest Atlas Search versions. Analyzers like `lucene.bengali`, `lucene.lithuanian`, `lucene.thai`, and `lucene.ukrainian` may also be available depending on the Atlas version but were not added to avoid introducing inaccuracies about the exact current list.
- The explicit `$sort` by `searchScore` after `$search` is redundant since `$search` already returns results sorted by relevance, but it is not incorrect and makes the sort order explicit for readers.
- The post correctly identifies the Snowball stemmer as the stemming algorithm used by `lucene.english`. Technically, Lucene's EnglishAnalyzer uses the Porter stemmer (part of the Snowball project), so this is accurate enough for a blog audience.
