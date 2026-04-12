# Validation Summary: How to Validate URLs in MongoDB Schema Validation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation, `$jsonSchema`, `pattern` constraint)
- JavaScript / Node.js (`URL` constructor for normalization)
- Regular expressions for URL matching

## Sources Consulted
- MongoDB documentation on schema validation: https://www.mongodb.com/docs/manual/core/schema-validation/
- MongoDB `$jsonSchema` keyword reference: https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/
- MongoDB `collMod` command reference: https://www.mongodb.com/docs/manual/reference/command/collMod/
- JSON Schema specification for `pattern` keyword (ECMA 262 regex): https://json-schema.org/understanding-json-schema/reference/string#regexp
- Node.js `URL` class documentation: https://nodejs.org/api/url.html#class-url

## Issues Found
- **Description mismatch in "Handling Optional URL Fields" section**: The `description` field said "Optional HTTPS URL for the company website" but the regex pattern `^https?://` accepts both HTTP and HTTPS URLs. Changed the description to "Optional HTTP or HTTPS URL for the company website" to accurately reflect what the pattern validates.

## Review Notes
- The "Accepting Additional Schemes" pattern (line 59) omits the `$` anchor and TLD requirement (`\.[a-zA-Z]{2,}`) present in the basic pattern. This makes it more permissive (e.g., `https://localhost` would match). This is not incorrect but is a notable difference from the stricter basic pattern.
- The simplified domain patterns in the `canonicalUrl` and `imageUrl` fields (using `[a-zA-Z0-9\-\.]+` instead of the label-by-label validation in the basic pattern) are looser but acceptable for demonstration purposes.
- The `require("url")` import for the `URL` class is unnecessary in Node.js v10+ where `URL` is a global, but it is not deprecated and still works correctly.
- All MongoDB syntax (`db.createCollection`, `db.runCommand` with `collMod`, `$jsonSchema` keywords including `bsonType`, `pattern`, `required`, `minLength`, `maxLength`, `anyOf`, `items`) is correct and current.
