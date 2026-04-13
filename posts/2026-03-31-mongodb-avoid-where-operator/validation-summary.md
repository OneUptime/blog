# Validation Summary: How to Avoid Using $where for Queries in MongoDB

## Status
validated

## Post Type
Tutorial / Best Practices Guide

## Technologies Covered
- MongoDB query operators (`$where`, `$expr`, `$regex`, `$gt`, `$lt`, `$multiply`, `$divide`)
- MongoDB aggregation expression operators
- NoSQL injection security concepts
- Server-side JavaScript execution in MongoDB

## Sources Consulted
- MongoDB official documentation: $where operator — https://www.mongodb.com/docs/manual/reference/operator/query/where/
- MongoDB official documentation: $expr operator — https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB official documentation: $regex operator — https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MongoDB official documentation: Server-side JavaScript deprecation notes — https://www.mongodb.com/docs/manual/core/server-side-javascript/

## Issues Found

1. **Misleading index claim for `$expr` with `$multiply`**: The code comment stated "can leverage indexes" on an example using `$expr` with `$multiply` across two fields. `$expr` can only leverage indexes for simple field-to-constant comparisons, not for computed multi-field expressions like `$multiply: ["$quantity", "$price"]`. Changed the comment to "no JavaScript execution" and clarified the introductory text to specify that index support applies to simple field-to-constant comparisons.

2. **Misleading `$expr` introductory text**: The text stated `$expr` has "proper index support in many cases" which overstated the index benefit for the computed examples shown. Changed to "It evaluates natively without JavaScript, and can use indexes for simple field-to-constant comparisons."

3. **`$regex` syntax incompatibility**: The example used `{ $regex: /@company\.com$/, $options: "i" }` — mixing a regex literal object with a separate `$options` field. This syntax is only supported starting in MongoDB 6.1. Changed to the universally compatible string form: `{ $regex: "@company\\.com$", $options: "i" }`.

## Review Notes
- The claim "Deprecated in newer drivers" (point 4 in the "Why $where Is Problematic" section) is directionally correct but slightly imprecise. The deprecation is primarily at the MongoDB server level (server-side JavaScript features were deprecated in MongoDB 8.0), not specifically in drivers. This is a minor wording nuance and was left as-is since the overall message is accurate.
- The claim "the query always becomes a collection scan" is technically only true when `$where` is the sole predicate. If combined with other indexed predicates, those predicates can use indexes to narrow documents before `$where` is applied as a post-filter. The paragraph text correctly notes "(or every document that passes earlier filter stages)" which provides the nuance, so no change was made to the numbered list.
- All code examples are syntactically correct MongoDB shell syntax and would execute as shown.
- The NoSQL injection example is accurate and effectively demonstrates the security risk.
