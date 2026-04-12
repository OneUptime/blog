# Validation Summary: How to Use Stop Words and Stemming in MongoDB Text Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB text search (`$text` operator)
- MongoDB text indexes (`createIndex` with `"text"` type)
- Snowball stemming library
- `$meta: "textScore"` scoring

## Sources Consulted
- MongoDB official docs: Text Indexes — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB official docs: $text operator — https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB official docs: Specify language for text index — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/specify-language-text-index/
- MongoDB source code: `src/mongo/db/fts/stemmer.h` confirming Snowball/libstemmer usage

## Issues Found
- **"No false negatives" claim in the Practical Implications table (line 87)**: The original table stated that stop word removal causes "no false negatives." This is incorrect — if a search query consists entirely of stop words (e.g., `$search: "the a is"`), MongoDB returns zero results because all terms are stripped, which is a false negative. Fixed the description to: "Common words are ignored - stop-word-only queries return nothing."

## Review Notes
- The phrase search section (lines 59-68) describes stop words being "stripped" from phrases. This is a practical simplification — stop words can't participate in phrase matching because they're not stored in the index. The observable behavior matches what the post describes, and the advice to use `default_language: "none"` for literal matching is correct.
- Code examples omit the prerequisite `createIndex` calls for the `posts` collection, which is a common blog post simplification and not an error.
- The comment on line 20 says tokens like "Art", "MongoDB", "Indexing" are stored, but in reality they are stored as lowercase stemmed forms (e.g., "art", "mongodb", "index"). This is a minor simplification acceptable for readability.
