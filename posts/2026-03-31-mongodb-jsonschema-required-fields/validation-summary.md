# Validation Summary: How to Use $jsonSchema with Required Fields in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (schema validation, `$jsonSchema` operator)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual: Specify JSON Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/
- MongoDB Manual: JSON Schema Tips — https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/json-schema-tips/
- MongoDB Manual: collMod Command — https://www.mongodb.com/docs/manual/reference/command/collMod/
- MongoDB Manual: db.getCollectionInfos() — https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/
- MongoDB Manual: Modify Schema Validation — https://www.mongodb.com/docs/manual/core/schema-validation/update-schema-validation/

## Issues Found

1. **Incorrect claim about dot notation in `required` array (line 75):**
   - **What was wrong:** The post stated "Use dot notation within the `required` array to require fields in subdocuments, or define nested schema." MongoDB's `$jsonSchema` does not support dot notation in the `required` array. Nested fields must be required using nested schema definitions with `properties` and nested `required` arrays.
   - **What was changed:** Replaced the sentence with "Define nested `required` arrays inside subdocument schemas to require fields in subdocuments:" which accurately describes the approach shown in the code example that follows.

2. **Incorrect null value example (lines 148-157):**
   - **What was wrong:** The post claimed that inserting `email: null` into the `users` collection would pass validation, with the comment "This passes - 'email' key is present (even though null)." However, the `users` collection schema defined earlier in the post includes `bsonType: "string"` on the `email` field, which rejects `null` values. The `required` check passes (the key exists), but the `bsonType` constraint causes the insert to fail.
   - **What was changed:** Updated the explanation and code comment to clarify that the insert fails due to the `bsonType: "string"` constraint. Added a note explaining that null would only be accepted if the schema used `required` without `bsonType` constraints.

## Review Notes
- The code examples for `createCollection`, `collMod`, `insertOne`, `getCollectionInfos`, and `listCollections` are all syntactically correct and use current, non-deprecated APIs.
- The `validationLevel: "strict"` and `validationAction: "error"` options in the `collMod` example are correct.
- The nested schema example for the `orders` collection correctly demonstrates the proper way to require fields in subdocuments.
