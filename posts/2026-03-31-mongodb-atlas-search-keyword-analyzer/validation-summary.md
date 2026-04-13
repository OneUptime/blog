# Validation Summary: How to Use the Keyword Analyzer in MongoDB Atlas Search

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Atlas Search
- Apache Lucene KeywordAnalyzer
- MongoDB Aggregation Pipeline (`$search`, `$searchMeta`, `$sort`, `$project`)
- Atlas Search index definitions (string, stringFacet, token types)

## Sources Consulted
- MongoDB Atlas Search documentation: index field type definitions (string, stringFacet, token types)
- MongoDB Atlas Search documentation: `$search` aggregation stage and `sort` option
- MongoDB Atlas Search documentation: `$searchMeta` facet collector
- MongoDB Atlas Search documentation: multi-analyzer field mappings using the `multi` property
- Apache Lucene KeywordAnalyzer documentation

## Issues Found

1. **Faceting type requirement was incorrect**: The post claimed that fields "must be indexed with `lucene.keyword` for faceting to work." In Atlas Search, faceting requires fields to be indexed with the `stringFacet` type, not just `string` with `lucene.keyword`. Fixed the claim to reference `stringFacet` type while noting that `lucene.keyword` can still be used alongside for exact-match queries.

2. **Sorting mechanism was incorrect**: The post claimed "Atlas Search requires a keyword-analyzed field for sort" and showed an index using `"type": "string", "analyzer": "lucene.keyword"` for sorting. In Atlas Search, string field sorting uses the `token` type, not a keyword-analyzed string. Fixed the "When to Use" bullet, the sorting index definition to use `token` type, and the sorting query to use the `sort` option within `$search` instead of `$sort` after `$search` with a non-existent document field.

3. **Sorting query used Atlas Search mapping name in `$sort`**: The original query `{ $sort: { "title.keyword": 1 } }` referenced an Atlas Search mapping name, but `$sort` operates on actual document fields, not Atlas Search index field names. Fixed to use the `sort` option within `$search`, which properly leverages the Atlas Search index.

4. **Multi-field syntax was incorrect**: The post used an array syntax with a `name` property (e.g., `"name": "title.keyword"`) to define multiple analyzers for the same field. The correct approach in Atlas Search is to use the `multi` property within a `string` type mapping. Fixed both the sorting and combining sections to use the proper `multi` syntax.

5. **Summary paragraph contained incorrect claims**: Updated to accurately reflect that the keyword analyzer is for exact-match queries, while `stringFacet` type is for faceting and `token` type is for sorting.

## Review Notes
- The core explanation of the keyword analyzer (treating the entire field value as a single unmodified token) is accurate and well-explained.
- The exact-match query example using `$search` with the `text` operator is correct.
- The faceting query syntax using `$searchMeta` with the `facet` collector is correct — only the index requirement claim needed fixing.
- The `sort` option within `$search` was introduced in newer versions of Atlas Search. For older versions, standard `$sort` after `$search` works but operates on document fields (not Atlas Search index mappings) and does not require special index configurations.
