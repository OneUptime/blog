# Validation Summary: How to Use the Standard Analyzer in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Search
- Lucene StandardAnalyzer
- MongoDB Aggregation Pipeline (`$search`, `$searchMeta`)
- Atlas Search index definitions (JSON format)
- Atlas CLI (`atlas`)

## Sources Consulted
- MongoDB Atlas Search Analyzers documentation: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/
- MongoDB Atlas Search `lucene.standard` analyzer reference: https://www.mongodb.com/docs/atlas/atlas-search/analyzers/standard/
- Lucene StandardAnalyzer Javadoc (Unicode Text Segmentation / UAX#29)
- MongoDB Atlas CLI documentation: https://www.mongodb.com/docs/atlas/cli/stable/
- MongoDB Atlas Search `$search` operator reference: https://www.mongodb.com/docs/atlas/atlas-search/query-syntax/
- MongoDB Atlas Search phrase operator reference: https://www.mongodb.com/docs/atlas/atlas-search/phrase/

## Issues Found

1. **Stop word removal incorrectly listed as part of the standard analyzer pipeline.** The post listed three operations for `lucene.standard`, with step 3 being "stop word removal (disabled by default in Atlas Search)." The Atlas Search `lucene.standard` analyzer only performs tokenization and lowercasing — it does not include a stop word filter at all. This is different from the raw Lucene StandardAnalyzer. Fixed by removing step 3, changing "three operations" to "two operations," and adding a clarifying note about needing a custom analyzer for stop word removal.

2. **Tokenization example showed incorrect step-by-step breakdown.** The "Understanding What the Standard Analyzer Does to Text" section showed tokens already lowercased after the tokenizer step (before the lowercase filter ran), making both steps produce identical output. The standard tokenizer preserves original casing; lowercasing is a separate filter step. Fixed by showing the tokenizer output with original casing (`["MongoDB's", "Atlas", "Search", "is", "AMAZING"]`), then the lowercase filter output (`["mongodb's", "atlas", "search", "is", "amazing"]`).

3. **Misleading `$searchMeta` `explain` reference.** The text claimed to show how to use `$searchMeta` `explain` to inspect token analysis, but the code example was a plain `$search` query with no explain functionality. Fixed by replacing the reference with `db.collection.explain().aggregate(...)`, which is the correct way to get explain output for Atlas Search queries.

4. **Deprecated `mongocli` reference.** The post referenced `mongocli` for applying index definitions, but MongoDB has deprecated `mongocli` in favor of the `atlas` CLI (MongoDB Atlas CLI). Updated to reference `atlas` CLI.

## Review Notes
- The multi-analyzer field mapping example uses the array syntax with `name` fields. MongoDB documentation more commonly shows the `multi` keyword approach for defining alternate analyzers on the same field. Both approaches work, but readers may find the `multi` syntax more consistent with official docs.
- The `$sort` by `searchScore` after `$search` is redundant since Atlas Search already returns results sorted by relevance score. It is not incorrect, but could be noted as optional.
- The post correctly notes that "is" (a common stop word) remains in the token output, which is consistent with the standard analyzer not removing stop words. This is a good illustrative detail.
