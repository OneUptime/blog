# Validation Summary: How to Store Regular Expressions in MongoDB Documents

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (BSON regex type 11)
- mongosh (MongoDB Shell)
- Node.js MongoDB driver (v6.x)
- Python PyMongo driver (`bson.regex.Regex`)
- MongoDB Aggregation Framework (`$regexMatch`)

## Sources Consulted
- MongoDB BSON Types documentation: https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB `$type` operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/type/
- MongoDB `$regexMatch` aggregation operator documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/regexMatch/
- js-bson deserializer source (bsonRegExp option defaults to false, returning native RegExp): https://github.com/mongodb/js-bson/blob/main/src/parser/deserializer.ts
- PyMongo `bson.regex.Regex` API documentation: https://pymongo.readthedocs.io/en/stable/api/bson/regex.html
- MongoDB Node.js driver BSON data handling: https://www.mongodb.com/docs/drivers/node/v6.x/data-formats/bson/

## Issues Found
No technical issues found.

## Review Notes
- The Node.js driver returns native JavaScript `RegExp` objects by default because the `bsonRegExp` deserialization option defaults to `false`. If a user stores a regex with PCRE-specific flags or syntax not representable in JavaScript's `RegExp`, the default deserialization will throw an error. The `bsonRegExp: true` option exists for that edge case, but this is outside the scope of this tutorial.
- The email validation regex used is a simplified pattern, not RFC 5322 compliant, but this is standard practice and appropriate for a tutorial example.
- The Python example correctly uses `bson.regex.Regex` for storage and converts flags to Python `re`-compatible integers via the `.flags` property for runtime use.
