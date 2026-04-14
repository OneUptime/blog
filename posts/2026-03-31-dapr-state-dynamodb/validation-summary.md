# Validation Summary: How to Use Dapr State Management with DynamoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management building block)
- AWS DynamoDB (NoSQL state store backend)
- AWS CLI (table creation and TTL configuration)
- AWS IAM (role-based authentication)
- Kubernetes (secret management)
- Python Dapr SDK (`dapr-client`)
- Go Dapr SDK (`github.com/dapr/go-sdk`)
- LocalStack (local DynamoDB testing)

## Sources Consulted
- Dapr DynamoDB state store component source code (`github.com/dapr/components-contrib/state/aws/dynamodb/dynamodb.go`)
- Dapr official documentation for the DynamoDB state store component
- Dapr Python SDK source code and API reference (`dapr/python-sdk`)
- Dapr Go SDK source code and API reference (`dapr/go-sdk`)
- Dapr state management HTTP API specification (`/v1.0/state/`)
- AWS CLI DynamoDB command reference

## Issues Found

### 1. Incorrect IAM policy actions (lines 104-110)
- **What was wrong:** The IAM policy included `dynamodb:BatchGetItem` and `dynamodb:BatchWriteItem`. Dapr's DynamoDB component does not use native DynamoDB batch APIs. Bulk operations in Dapr are implemented by iterating over individual Get/Set/Delete calls via the default bulk store wrapper.
- **What was changed:** Removed `dynamodb:BatchGetItem` and `dynamodb:BatchWriteItem` from the IAM policy, leaving only `GetItem`, `PutItem`, `DeleteItem`, and `TransactWriteItems`.
- **Why:** Including unnecessary IAM actions violates the principle of least privilege and could mislead readers into thinking Dapr uses native batch operations on DynamoDB.

### 2. Incorrect DynamoDB item structure fields (lines 222-231)
- **What was wrong:** The example DynamoDB item included `insertionDate` and `updateDate` fields. Dapr's DynamoDB component does not store these timestamp fields. It only stores `key`, `value`, `etag`, and the TTL attribute (if configured).
- **What was changed:** Removed the `insertionDate` and `updateDate` fields from the example item JSON.
- **Why:** These fields do not exist in the Dapr DynamoDB component source code and showing them would confuse readers who inspect their actual DynamoDB items.

### 3. Incorrect TTL metadata in curl example (line 257)
- **What was wrong:** The TTL curl example passed `ttlInSeconds` via the `options` field as an integer: `"options": {"ttlInSeconds": 3600}`. In the Dapr state API, `options` is reserved for `concurrency` and `consistency` settings only. TTL must be passed via `metadata` as a string value.
- **What was changed:** Changed `"options": {"ttlInSeconds": 3600}` to `"metadata": {"ttlInSeconds": "3600"}`.
- **Why:** Using `options` would silently ignore the TTL setting, meaning state items would never expire as the reader expects.

## Review Notes
- The post does not mention the `partitionKey` metadata field, which allows customizing the DynamoDB partition key name (default is `key`). This is fine for a getting-started tutorial but could be noted in future updates.
- The post does not mention the `sessionToken` metadata field for temporary AWS credentials. This is a minor omission.
- The Go example ignores the error from `json.Marshal(sess)` on line 201, which is acceptable for a tutorial but not recommended for production code.
- The key prefix strategy (`appid` by default) is correctly explained, but the post doesn't mention that it can be changed via the `keyPrefix` metadata field to `name`, `namespace`, or `none`.
- All SDK code examples (Python and Go) are syntactically correct and use current, non-deprecated APIs.
- The AWS CLI commands for table creation, TTL enablement, and table status verification are all correct.
