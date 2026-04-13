# Validation Summary: How to Store and Query Regular Expression Values in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (BSON regex type, type 11)
- mongosh (MongoDB Shell)
- MongoDB Node.js Driver (`mongodb` npm package)
- Python PyMongo (`pymongo` and `bson.regex.Regex`)
- JavaScript RegExp
- Python `re` module

## Sources Consulted
- MongoDB BSON Types documentation: https://www.mongodb.com/docs/manual/reference/bson-types/
- MongoDB $type operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/type/
- MongoDB $regex operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/regex/
- MongoDB Node.js Driver BSON deserialization behavior (BSONRegExp vs RegExp)
- PyMongo bson.regex.Regex class documentation: https://pymongo.readthedocs.io/en/stable/api/bson/regex.html
- BSON specification: https://bsonspec.org/spec.html

## Issues Found
1. **Dynamic Routing Rules section — missing `active` field on inserted documents**: The inserted route documents did not include an `active` field, but the subsequent `routeRequest` function queried with `{ active: true }`, which would return zero results. Fixed by adding `active: true` to all three inserted route documents.

## Review Notes
- The BSON regex type number (11) and string alias ("regex") for `$type` queries are correct.
- The claim that the Node.js driver returns native JavaScript `RegExp` objects (not `BSONRegExp`) by default is correct — the driver's `bsonRegExp` option defaults to `false`, so BSON regex values are deserialized as native `RegExp` objects with `.test()` and `.exec()` methods available.
- The Python example using `re.compile(pattern.pattern, pattern.flags)` is correct — `bson.regex.Regex` stores flags as Python `re` integer constants, so they can be passed directly to `re.compile`. An alternative approach is to use `pattern.try_compile()`.
- The post correctly emphasizes that MongoDB cannot execute stored BSON regex patterns server-side against other field values — pattern matching must happen in application code. This is an important distinction that readers often misunderstand.
- The `$regex` operator vs stored BSON regex distinction is accurately explained.
