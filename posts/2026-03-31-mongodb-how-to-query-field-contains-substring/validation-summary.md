# Validation Summary: How to Query Documents Where a Field Contains a Substring in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query engine, regex, text indexes, Atlas Search)
- MongoDB Node.js Driver
- JavaScript

## Sources Consulted
- MongoDB $regex operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MongoDB $text operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/text/
- MongoDB text indexes documentation: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB Atlas Search wildcard operator documentation: https://www.mongodb.com/docs/atlas/atlas-search/wildcard/
- MongoDB Node.js Driver v4 migration guide (find() API changes): https://www.mongodb.com/docs/drivers/node/current/upgrade/
- MongoDB index use with regular expressions: https://www.mongodb.com/docs/manual/reference/operator/query/regex/#index-use

## Issues Found

1. **Incorrect claim that $text supports substring searching**: The Full-Text Search section intro stated "For efficient substring and full-word searching" but MongoDB's `$text` operator only supports full-word (stemmed) matching, not substring/partial word matching. The limitations note at the end of the section correctly stated "no support for partial word matching," contradicting the intro. Changed to "For efficient full-word searching."

2. **Confusing regex notation in performance warning**: The text used `.*/widget` to illustrate a leading wildcard regex. This notation is ambiguous — it looks like a regex pattern containing a literal `/` character rather than a JavaScript regex literal with a wildcard prefix. Changed to `/.*widget/` which is the correct JavaScript regex literal form.

3. **Outdated find() projection syntax for $text search**: The code passed the text score projection as a bare second argument to `find()`: `find(filter, { score: { $meta: 'textScore' } })`. Since MongoDB Node.js Driver v4 (released 2021), `find()` no longer accepts a projection as the second positional argument — the second argument is `FindOptions` which requires a `projection` key. The code as written would silently ignore the projection in driver v4+. Fixed to use `{ projection: { score: { $meta: 'textScore' } } }`.

## Review Notes
- The "Anchoring Patterns" section shows `/^wid/i` (case-insensitive prefix regex) with a comment saying it "can use a regular index on 'name'." While technically true (MongoDB will use the index), case-insensitive regex queries cannot use the index as efficiently as case-sensitive ones — the engine must scan all index entries rather than performing a bounded range scan. The performance section correctly notes that only case-sensitive prefix patterns (e.g., `/^widget/`) show IXSCAN efficiently. This nuance could be clarified in a future revision.
- The text index limitation note ("only one text index per collection") is correct and an important caveat worth keeping.
- All Atlas Search syntax is correct for the current Atlas Search API.
