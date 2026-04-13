# Validation Summary: How to Build Custom Analyzers with Tokenizers in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB Atlas Search
- Custom Analyzers (tokenizers, token filters)
- Lucene-based full-text search
- MongoDB Aggregation Pipeline (`$search` stage)

## Sources Consulted
- MongoDB Atlas Search Tokenizers documentation: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/tokenizers/
- MongoDB Atlas Search Custom Analyzers documentation: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/custom/
- MongoDB Atlas Search Token Filters documentation: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/token-filters/
- MongoDB Atlas Search `$search` aggregation stage documentation: https://www.mongodb.com/docs/atlas/atlas-search/aggregation-stages/search/
- MongoDB Atlas Search `text` operator documentation: https://www.mongodb.com/docs/atlas/atlas-search/operators-collectors/text/
- MongoDB Atlas Search string field type documentation: https://www.mongodb.com/docs/atlas/atlas-search/field-types/string-type/

## Issues Found

1. **`tokenChars` parameter does not exist in Atlas Search tokenizers**: The `edgeGram` and `nGram` tokenizer examples included a `tokenChars` parameter (e.g., `["letter", "digit"]`), which is an Elasticsearch `edge_ngram`/`ngram` tokenizer option, not a MongoDB Atlas Search option. Atlas Search `edgeGram` and `nGram` tokenizers only accept `type`, `minGram`, and `maxGram`. Removed `tokenChars` from three locations: the autocomplete analyzer example, the substring analyzer example, and the full index configuration example.

2. **Incomplete tokenizer list**: The "Available Tokenizers" section listed 6 of the 8 available tokenizer types. Added the missing `regexSplit` (splits tokens using a regex delimiter) and `uaxUrlEmail` (tokenizes URLs and email addresses as single tokens) to the list. The `regexSplit` type was already used correctly in the "Regex Tokenizer" example but was not listed in the overview.

## Review Notes
- The `regexSplit` example code was correct despite not being in the overview list — the `pattern` parameter and regex syntax are valid.
- The `standard` tokenizer's `maxTokenLength: 255` is the documented default value; the example is technically redundant but not incorrect.
- The advice about using different analyzers for indexing vs. search with n-gram tokenizers is sound and well-explained.
- The `$search` query does not specify an `index` name, which means it defaults to the `"default"` index. This is acceptable for a simplified example.
