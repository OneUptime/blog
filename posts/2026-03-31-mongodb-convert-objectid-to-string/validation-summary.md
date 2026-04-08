# Validation Summary: How to Convert ObjectId to String in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh, aggregation framework)
- MongoDB Node.js Driver
- PyMongo / bson (Python)
- Pydantic v2
- MongoDB aggregation operators: `$toString`, `$toDate`, `$convert`, `$out`

## Sources Consulted
- MongoDB mongosh documentation for ObjectId methods: https://www.mongodb.com/docs/manual/reference/method/ObjectId/
- MongoDB aggregation `$toString` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/toString/
- MongoDB aggregation `$toDate` operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/toDate/
- MongoDB Node.js Driver ObjectId API: https://mongodb.github.io/node-mongodb-native/
- PyMongo / bson ObjectId documentation: https://pymongo.readthedocs.io/en/stable/api/bson/objectid.html
- Pydantic v2 field_validator documentation: https://docs.pydantic.dev/latest/concepts/validators/

## Issues Found
1. **`.str` property does not exist in mongosh** — The post recommended `id.str` as "Method 2" for converting an ObjectId to a string in mongosh. The `.str` property was available in the legacy `mongo` shell but was removed in `mongosh`. Using it in mongosh throws an `undefined` result. Replaced `id.str` with `id.toHexString()`, which is the correct alternative method available in both mongosh and MongoDB drivers. Updated the introductory text for the section accordingly.

## Review Notes
- The section titled "Use $convert for Bulk Transformations" mentions `$convert` in its heading but the code example actually uses `$toString` (which is a shorthand for `$convert` with `to: "string"`). This is not technically wrong since `$toString` is equivalent to `{ $convert: { input: ..., to: "string" } }`, but the heading is slightly misleading. Not changed since the code is correct and functional.
- The `$out` pipeline that overwrites `_id` with a string value is a valid operation but users should be aware this changes the `_id` type permanently in the output collection, which affects indexing and query behavior.
