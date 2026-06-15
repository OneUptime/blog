# Validation Summary: How to Create Search Functionality in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- Express
- MongoDB text search
- Mongoose
- MongoDB regular expression queries
- PostgreSQL full-text search
- Knex.js
- Fuse.js
- node-cache

## Sources Consulted
- MongoDB `$text` query operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB `$meta` textScore documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/meta/
- MongoDB text index weights documentation: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/control-text-search-results/
- Mongoose schema and index documentation: https://mongoosejs.com/docs/guide.html
- PostgreSQL full-text search controls documentation: https://www.postgresql.org/docs/current/textsearch-controls.html
- Knex.js installation and configuration documentation: https://knexjs.org/guide/
- Knex.js raw parameter binding documentation: https://knexjs.org/guide/raw.html
- Fuse.js fuzzy search documentation: https://www.fusejs.io/fuzzy-search.html
- MDN JavaScript regular expression documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions
- MDN `RegExp.escape()` documentation: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape

## Issues Found
- The PostgreSQL/Knex example imported `require('knex')` directly and then used it as a configured query builder instance. Updated it to require a configured local Knex instance because the official Knex API requires initialization with database configuration before executing queries.
- The PostgreSQL search example created an unused `searchTerms` variable and described converting to tsquery format while the actual query used `plainto_tsquery`. Removed the unused variable and used `plainto_tsquery('english', ?)` consistently with the generated `english` tsvector.
- The combined MongoDB search endpoint selected and sorted by `$meta: 'textScore'` whenever `q` was present, even when `q` was shorter than the length required to add the `$text` predicate. Added a `hasTextSearch` flag so text-score projection and sorting only happen with an actual `$text` query.
- The highlighting helper built a `RegExp` directly from user query terms. Escaped each term before constructing the regex and filtered empty terms so special characters in search input are treated literally.

## Review Notes
The examples are appropriate for tutorial use. In production, the regex search endpoint should restrict `field` to an allowlist of searchable fields, and the Fuse.js example should guard against requests arriving before the in-memory index is initialized.
