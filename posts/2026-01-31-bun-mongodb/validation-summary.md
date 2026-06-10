# Validation Summary: How to Use MongoDB with Bun

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bun runtime
- MongoDB
- MongoDB Node.js driver (`mongodb` npm package)
- TypeScript
- BSON / ObjectId
- MongoDB aggregation framework
- MongoDB transactions / sessions
- MongoDB schema validation ($jsonSchema)

## Sources Consulted
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Manual (CRUD, aggregation, transactions, schema validation): https://www.mongodb.com/docs/manual/
- MongoDB driver API reference (MongoClient, Collection, ClientSession): https://mongodb.github.io/node-mongodb-native/
- Bun CLI documentation: https://bun.sh/docs/cli/init and https://bun.sh/docs/cli/add
- MongoDB server error codes reference (e.g., 11000 duplicate key, 121 document validation failure, 26 namespace not found)
- TypeScript handbook (operator precedence, optional chaining)

## Issues Found
- **Operator precedence bug in `handleMongoError`**: The original code was
  ```ts
  "Document validation failed: " + error.errInfo?.details?.schemaRulesNotSatisfied?.[0]?.description || "Invalid document"
  ```
  Because `+` binds tighter than `||`, the expression evaluated as `(string + undefined) || "Invalid document"`, producing the truthy string `"Document validation failed: undefined"` and never falling back to `"Invalid document"`. Fixed by wrapping the optional chain so the fallback applies to the missing description:
  ```ts
  "Document validation failed: " + (error.errInfo?.details?.schemaRulesNotSatisfied?.[0]?.description || "Invalid document")
  ```

## Review Notes
- The MongoDB Node.js driver v6+ `findOneAndUpdate` default return is the document itself (not a `ModifyResult` wrapper). The post's `return result;` matches that current behavior. On older v4 drivers this would have returned `{ value, ok, ... }` — readers on legacy versions would need `result.value`.
- The `createPooledClient` options pass `w: "majority"` and `wtimeoutMS: 10000` at the top level. These still work in the current driver but are increasingly expressed as `writeConcern: { w: "majority", wtimeoutMS: 10000 }`. Functionally equivalent, so left as-is.
- `bun init -y` and `bun add mongodb` are correct against the current Bun CLI.
- Error code `26` (`NamespaceNotFound`) is the correct trigger for the "collection does not yet exist" branch when running `collMod`.
- The `searchUsers` function passes user input directly into `$regex`. The post's Security best-practices section recommends parameterized queries generally, but does not flag that raw regex queries against user-supplied text can expose ReDoS or unintended regex metacharacter behavior. Worth noting for production use, but not a strict technical error.
- The aggregation pipelines are cast via `as Promise<...>` after `.toArray()`. This compiles and runs correctly but loses type-safety. A future improvement could use generic `aggregate<T>()` typing.
