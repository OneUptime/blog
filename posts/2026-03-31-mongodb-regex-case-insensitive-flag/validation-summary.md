# Validation Summary: How to Use Regex with Case-Insensitive Flag in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query engine, regex, collation, indexing)
- JavaScript (MongoDB shell syntax)

## Sources Consulted
- MongoDB $regex operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MongoDB Collation documentation: https://www.mongodb.com/docs/manual/reference/collation/
- MongoDB Case-Insensitive Indexes: https://www.mongodb.com/docs/manual/core/index-case-insensitive/
- MongoDB $regexMatch aggregation operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexMatch/
- MongoDB Jira SERVER-29865 (regex + collation index support): https://jira.mongodb.org/browse/SERVER-29865

## Issues Found

### 1. Incorrect claim that regex works with collation indexes (Section: "Case-Insensitive Starts-With with Collation")
- **What was wrong:** The post showed `db.products.find({ name: /^lap/ }).collation({ locale: "en", strength: 2 })` and claimed "The collation index lets MongoDB perform a case-insensitive prefix index scan." This is incorrect — `$regex` does not support collation and cannot use collation indexes. This is documented in the MongoDB $regex docs and confirmed in MongoDB Jira ticket SERVER-29865 (resolved as "Works as Designed").
- **What was changed:** Replaced the regex example with a range query (`$gte`/`$lt`) that correctly uses the collation index for prefix matching. Added a note that `$regex` does not support collation.
- **Why:** Readers following the original advice would get a collection scan or inefficient index scan instead of the promised collation-backed index scan.

### 2. Summary section updated for consistency
- **What was wrong:** The summary stated "The collation approach supports both equality and prefix (starts-with) patterns" without clarifying that prefix matching requires range queries, not regex.
- **What was changed:** Added "(not regex)" clarification to the summary sentence.
- **Why:** Consistency with the corrected section above.

## Review Notes
- The collation strength explanation ("`strength: 2` means the collation ignores case (and accent differences at strength 1)") is technically correct but could be clearer. Strength 2 ignores case but considers accents; strength 1 ignores both case and accents. The parenthetical is parseable as a side note about strength 1 behavior, so it was left as-is.
- The summary's claim that the `i` flag "always triggers a collection scan" is a slight simplification — an anchored case-insensitive regex like `/^laptop/i` might still use an index, though inefficiently. This is an acceptable simplification for a tutorial context.
- The `$regexMatch` aggregation example wraps the expression in `$expr`, which is correct but verbose. It could also be written as `$match: { name: { $regex: "laptop", $options: "i" } }`. Both approaches are valid.
