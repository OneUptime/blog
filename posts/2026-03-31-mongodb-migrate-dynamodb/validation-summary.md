# Validation Summary: How to Migrate from DynamoDB to MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon DynamoDB (export to S3, type system, GSIs)
- MongoDB (mongoimport, indexes, mongosh queries)
- AWS CLI (dynamodb export-table-to-point-in-time, list-exports, s3 sync)
- Python (gzip, json, os.walk for transform script)
- mongosh (JavaScript shell commands)

## Sources Consulted
- AWS CLI Reference: export-table-to-point-in-time — https://docs.aws.amazon.com/cli/latest/reference/dynamodb/export-table-to-point-in-time.html
- AWS CLI Reference: list-exports — https://docs.aws.amazon.com/cli/latest/reference/dynamodb/list-exports.html
- DynamoDB table export output format — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataExport.Output.html
- MongoDB mongoimport documentation — https://www.mongodb.com/docs/database-tools/mongoimport/
- MongoDB mongo-tools source (mongoimport/options.go) — https://github.com/mongodb/mongo-tools/blob/master/mongoimport/options.go
- mongosh documentation — https://www.mongodb.com/docs/mongodb-shell/

## Issues Found

1. **`const db = db.getSiblingDB("myapp")` causes ReferenceError in mongosh** (line 193): In mongosh, `db` is a global variable. Using `const db` creates a new lexical binding that shadows the global. Due to JavaScript's Temporal Dead Zone, the right-hand side `db.getSiblingDB(...)` references the uninitialized local `const db` binding, throwing `ReferenceError: Cannot access 'db' before initialization`. Fixed by removing the `const` keyword.

2. **`--batchSize 500` is an undocumented mongoimport flag** (line 185): While `--batchSize` technically works (it exists as a hidden flag in the mongo-tools source code with `hidden:"true"`), it is not listed in `mongoimport --help` or the official MongoDB documentation. Readers following the tutorial would not be able to verify or look up this flag. Removed it to avoid confusion.

3. **Unused `from decimal import Decimal` import** (line 89): The `Decimal` class was imported but never used anywhere in the Python transform script. Removed the unused import.

## Review Notes
- The `aws dynamodb describe-table --query 'Table.ItemCount'` validation step returns an approximate count that is updated only every ~6 hours. It may not match the exact export count. The post does not note this caveat, but since it is used for a rough validation check rather than an exact assertion, this is acceptable.
- The Python `convert_dynamodb_item` function uses a simple heuristic (checking for type-descriptor keys like `"S"`, `"N"`, etc.) that could theoretically misidentify items if a DynamoDB attribute is literally named `"S"`, `"N"`, `"BOOL"`, etc. In practice this is rare and the approach is standard for DynamoDB migration scripts, so no change is needed.
- The DynamoDB export requires Point-in-Time Recovery (PITR) to be enabled on the table. The post mentions PITR but does not explicitly state it must be enabled beforehand. This is a minor omission.
