# Validation Summary: How to Optimize Regex Queries with Indexes in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (query engine, indexing, profiler)
- JavaScript (MongoDB shell syntax)
- Regular expressions (PCRE-style patterns)
- MongoDB collation
- MongoDB text indexes

## Sources Consulted
- MongoDB $regex operator documentation — https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MongoDB Case-Insensitive Indexes documentation — https://www.mongodb.com/docs/manual/core/index-case-insensitive/
- MongoDB $regexMatch documentation — https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexmatch/
- MongoDB explain() documentation — https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- MongoDB Collation documentation — https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB Database Profiler documentation — https://www.mongodb.com/docs/manual/tutorial/manage-the-database-profiler/
- MongoDB Text Indexes documentation — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB Compound Indexes documentation — https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/

## Issues Found
- **Collation + regex combination was incorrect.** The original post suggested creating a collation index and querying with `db.users.find({ username: /^john/ }).collation({ locale: "en", strength: 2 })` for case-insensitive prefix matching. This does not work because `$regex` is not collation-aware — MongoDB's documentation explicitly states that "case-insensitive indexes do not improve performance for $regex queries, as the $regex operator is not collation-aware and therefore cannot take advantage of such indexes." The collation modifier is silently ignored for regex operations. **Fix:** Replaced the approach with storing a lowercased copy of the field (`usernameLower`) and querying that with a case-sensitive prefix regex, which correctly uses the index. Added a note clarifying that `$regex` is not collation-aware, and showed collation with non-regex equality queries as a separate valid use case.
- **Summary section referenced incorrect advice.** The summary recommended "use a collation index" for case-insensitive queries, which reflected the incorrect collation + regex approach. **Fix:** Updated to recommend storing a lowercased field and noted the collation limitation.

## Review Notes
- The claim that `/^john/i` "Does NOT use index" is a simplification. In practice, case-insensitive regex may still trigger an IXSCAN but with very broad index bounds (effectively scanning the entire index), which is far less efficient than prefix-bounded scanning. The blog's practical advice to avoid `/i` for index performance is sound.
- The index bounds example `["john", "joho")` is correct — MongoDB increments the last character of the prefix ('n' → 'o') to compute the upper bound.
- The reversed-string workaround for suffix search is a valid pattern. The example correctly reverses "@gmail.com" to "moc.liamg@" for prefix matching.
- Text indexes are correctly recommended for word-level contains matching as an alternative to regex.
- The profiler syntax and field names (`millis`, `ns`, `ts`) are correct for MongoDB's system.profile collection.
- All other code examples are syntactically correct and use current MongoDB APIs.
