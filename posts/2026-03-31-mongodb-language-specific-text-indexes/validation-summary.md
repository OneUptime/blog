# Validation Summary: How to Configure Language-Specific Text Indexes in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB text indexes
- MongoDB `$text` query operator
- MongoDB `createIndex` with `default_language` and `language_override` options
- MongoDB full-text search with language-specific stemming

## Sources Consulted
- MongoDB Manual: Text Search Languages Reference (https://www.mongodb.com/docs/manual/reference/text-search-languages/)
- MongoDB Manual: Text Indexes (https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/)
- MongoDB Manual: `$text` Query Operator (https://www.mongodb.com/docs/manual/reference/operator/query/text/)
- MongoDB Manual: `createIndex` (https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/)

## Issues Found

1. **Arabic incorrectly listed as a supported language.** The post listed `arabic` among the supported languages for MongoDB text indexes. MongoDB's built-in text indexes support exactly 15 languages (danish, dutch, english, finnish, french, german, hungarian, italian, norwegian, portuguese, romanian, russian, spanish, swedish, turkish). Arabic is not supported by standard text indexes — it is available in MongoDB Atlas Search (which uses Lucene analyzers), but that is a different feature. Removed `arabic` from the list and changed "over 15" to "15".

2. **Incorrect explanation of query-time stemming behavior.** The "Querying Across Languages" section stated that "the query string is stemmed using the same language as the document." This is incorrect. At query time, the search string is stemmed using the index's default language (or the `$language` override specified in the query). It is not re-stemmed per document. Documents are individually stemmed at index time using their per-document language via `language_override`, but the query uses a single language for stemming. Rewrote the paragraph to accurately describe this behavior.

## Review Notes
- The post correctly covers the core `default_language` and `language_override` options, disabling language processing with `"none"`, and the `$language` query override.
- All `createIndex`, `insertMany`, `find`, and `getIndexes` code examples use correct syntax.
- The `language_override: "lang"` example correctly demonstrates pointing to a custom field name rather than the default `language` field.
