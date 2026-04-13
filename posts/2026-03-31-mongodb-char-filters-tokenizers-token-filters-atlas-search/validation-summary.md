# Validation Summary: How to Use Char Filters, Tokenizers, and Token Filters in Atlas Search

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- MongoDB Atlas Search
- Custom Analyzers (char filters, tokenizers, token filters)
- Full-Text Search indexing pipeline

## Sources Consulted
- MongoDB Atlas Search Custom Analyzers documentation: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/custom/
- MongoDB Atlas Search Tokenizers documentation: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/tokenizers/
- MongoDB Atlas Search Token Filters documentation: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/token-filters/
- MongoDB Atlas Search Character Filters documentation: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/character-filters/

## Issues Found

1. **Incorrect tokenizer type `edgeNGram` (should be `edgeGram`)**: Atlas Search uses `edgeGram` as the tokenizer type name, not `edgeNGram`. Fixed the type in the JSON example, the section heading, and the summary paragraph.

2. **Inconsistent nGram tokenizer parameters**: The JSON config showed `"minGram": 3, "maxGram": 5` but the accompanying input/output example described behavior with `minGram=2, maxGram=3`. Fixed the JSON to use `minGram: 2, maxGram: 3` to match the example output.

3. **Misleading "Persian (icuNormalize)" heading**: The `icuNormalize` char filter is a general-purpose Unicode normalization filter, not specific to Persian. Atlas Search has a separate `persian` char filter type (which replaces zero-width non-joiners with spaces). Fixed the heading to just "icuNormalize".

## Review Notes
- Atlas Search also has a `persian` char filter (distinct from `icuNormalize`) that the post does not cover. This is fine for the scope of the article.
- The post does not cover all available tokenizers (e.g., `uaxUrlEmail`, `regexCaptureGroup`) or all token filters (e.g., `icuFolding`, `snowballStemming`, `wordDelimiterGraph`). This is acceptable as the post is focused on commonly used components.
- All JSON structures, field names (`charFilters`, `tokenizer`, `tokenFilters`), and the custom analyzer definition format are correct per official documentation.
