# Validation Summary: How to Validate String Patterns in MongoDB Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation, `$jsonSchema`)
- JSON Schema (pattern, minLength, maxLength, enum keywords)
- Regular Expressions (PCRE/PCRE2)

## Sources Consulted
- MongoDB official documentation: `$jsonSchema` keyword reference (https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/)
- MongoDB official documentation: `db.createCollection()` (https://www.mongodb.com/docs/manual/reference/method/db.createCollection/)
- MongoDB official documentation: `collMod` command (https://www.mongodb.com/docs/manual/reference/command/collMod/)
- MongoDB official documentation: Schema validation levels and actions (https://www.mongodb.com/docs/manual/core/schema-validation/)
- MongoDB official documentation: `$regex` operator / PCRE engine details (https://www.mongodb.com/docs/manual/reference/operator/query/regex/)

## Issues Found
No technical issues found.

## Review Notes
- The post refers to `pattern` as using "a PCRE regex." This is correct for MongoDB's implementation, though starting in MongoDB 6.1 the engine was upgraded from PCRE to PCRE2. For the patterns used in this post, the distinction is immaterial.
- The description of `validationLevel: "moderate"` as skipping validation for "unmodified legacy data" is slightly imprecise — `moderate` skips validation for updates to documents that already violate the rules, regardless of whether they are being modified. The practical guidance is sound.
- The `minLength`/`maxLength` constraints on the username field are redundant with the regex `{2,19}` quantifier but are not incorrect — they serve as a defense-in-depth measure and improve readability.
- The YYYY-MM-DD date regex validates month (01-12) and day (01-31) ranges but does not account for month-specific day limits (e.g., Feb 30). This is a well-known limitation of regex-based date validation and is acceptable for a blog post example.
