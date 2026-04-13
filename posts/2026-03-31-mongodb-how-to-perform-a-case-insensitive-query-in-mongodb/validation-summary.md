# Validation Summary: How to Perform a Case-Insensitive Query in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (shell commands and Node.js driver)
- MongoDB Collation (ICU collation strength levels)
- MongoDB Regular Expressions ($regex, $options)
- MongoDB Text Indexes ($text, $search)

## Sources Consulted
- MongoDB documentation on $regex operator: https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MongoDB documentation on Collation: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB documentation on Text Indexes: https://www.mongodb.com/docs/manual/core/indexes/index-types/index-text/
- MongoDB documentation on db.collection.findOne(): https://www.mongodb.com/docs/manual/reference/method/db.collection.findOne/
- MongoDB documentation on db.collection.find(): https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- ICU Collation specification for strength levels: https://unicode-org.github.io/icu/userguide/collation/concepts.html

## Issues Found
- **`findOne()` with chained `.collation()`**: In the "Practical Comparison" section (Option B), the original code used `db.users.findOne({ username: "JohnDoe" }).collation({ locale: "en", strength: 2 })`. The `findOne()` method returns a document directly, not a cursor, so cursor methods like `.collation()` cannot be chained on it. Fixed to use `db.users.find({ username: "JohnDoe" }).collation({ locale: "en", strength: 2 }).limit(1)`, which correctly chains `.collation()` on the cursor returned by `find()` and uses `.limit(1)` to replicate `findOne` behavior.

## Review Notes
- The collation strength level descriptions are accurate per the ICU specification: strength 1 ignores case and accents, strength 2 ignores case but considers accents, strength 3 (default) is fully case-sensitive.
- The regex syntax examples correctly show both the regex literal form (`/pattern/i`) and the `$regex`/`$options` operator form.
- The claim that regex queries cannot use indexes efficiently unless anchored at the start is generally correct, though for case-insensitive regex specifically, even anchored patterns have limited index utilization compared to collation-based queries. The post's recommendation to prefer collation over regex for performance is sound.
- The normalized lowercase field approach is a valid and well-known pattern for maximum query performance at the cost of storage and write-time overhead.
