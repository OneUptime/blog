# Validation Summary: How to Validate Email Addresses in MongoDB Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation, `$jsonSchema`)
- JavaScript / mongosh
- Node.js (`validator.js` library)
- Regular expressions (ECMA 262 / PCRE2)

## Sources Consulted
- MongoDB $jsonSchema Documentation — https://www.mongodb.com/docs/manual/reference/operator/query/jsonschema/
- MongoDB Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB Specify Validation Level — https://www.mongodb.com/docs/manual/core/schema-validation/specify-validation-level/
- MongoDB Modify Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/update-schema-validation/
- MongoDB collMod Documentation — https://www.mongodb.com/docs/manual/reference/command/collmod/
- MongoDB db.getCollectionInfos() — https://www.mongodb.com/docs/manual/reference/method/db.getcollectioninfos/
- MongoDB $regex Documentation — https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- JSON Schema Regular Expressions (ECMA 262) — https://json-schema.org/understanding-json-schema/reference/regular_expressions

## Issues Found
1. **Line 17 — "accepts a BSON regex" was inaccurate.** The `pattern` keyword in `$jsonSchema` accepts a JSON string containing a regex pattern (per JSON Schema draft 4), not a BSON regex object. BSON regex (`/pattern/flags`) is used with the `$regex` operator, which is a different feature. Changed to "accepts a regex string".

2. **Line 141 — "uses PCRE-style regex" was misleading.** The `pattern` keyword formally follows JSON Schema draft 4 regex semantics (ECMA 262). MongoDB's internal engine happens to be PCRE2, but describing it as "PCRE-style" could mislead readers about portability to other JSON Schema validators. Updated to clarify both the formal semantics and the internal engine.

## Review Notes
- All `$jsonSchema` keywords used (`pattern`, `minLength`, `maxLength`, `items`, `enum`, `bsonType`, `required`, `description`) are verified as supported.
- The `validationAction` ("error"/"warn") and `validationLevel` ("strict"/"moderate") values are correct. The post omits `validationLevel: "off"` but does not claim to enumerate all values.
- The `collMod` command syntax for updating validators is correct.
- `db.getCollectionInfos()` usage is correct for inspecting collection validators.
- Backslash escaping in the regex patterns is correct (double-escaped for JSON string parsing).
- The email regex pattern is a reasonable basic validation pattern, though it does not cover all valid email formats per RFC 5321/5322 (e.g., quoted local parts, internationalized domain names). This is acceptable given the post's scope and is acknowledged in the Limitations section.
