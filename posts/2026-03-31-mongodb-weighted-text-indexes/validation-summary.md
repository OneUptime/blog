# Validation Summary: How to Use Weighted Text Indexes in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (text indexes, weighted indexes, full-text search)
- MongoDB Shell (mongosh) JavaScript API
- `$text` query operator
- `$meta` expression operator (`textScore`)

## Sources Consulted
- MongoDB official documentation: `db.collection.createIndex()` — weights option and text index creation
- MongoDB official documentation: Text Index Restrictions (one text index per collection)
- MongoDB official documentation: `$text` query operator
- MongoDB official documentation: `$meta` expression operator (`textScore`)
- MongoDB official documentation: `db.collection.getIndexes()`
- MongoDB official documentation: Compound text indexes and prefix fields for filtering optimization

## Issues Found
- **Misleading claim about category filter optimization**: The post stated "the `category` filter narrows the candidate set before scoring." This is only true if `category` is included as a prefix field in a compound text index. The example index definition does not include `category`, so without a compound index, MongoDB performs the text search first and then applies the category filter as a post-filter. Updated the sentence to clarify that a compound text index with `category` as a prefix is needed for this optimization.

## Review Notes
- All code examples use correct syntax and current (non-deprecated) APIs.
- The `createIndex` with `weights` option, `$meta: "textScore"` projection/sort, `dropIndex`, and `getIndexes().filter()` patterns are all accurate.
- The post does not mention that weight values must be integers between 1 and 99,999 (per MongoDB docs). All example values used (1, 5, 6, 8, 10, 15) are valid, so this is not an error, but readers attempting extreme or decimal weights would not be warned.
- The claim "only one text index per collection" remains accurate in current MongoDB versions. MongoDB Atlas Search is the alternative for multiple full-text indexes.
- The `getIndexes().filter()` pattern works in both mongosh and the legacy mongo shell since both return a JavaScript array.
