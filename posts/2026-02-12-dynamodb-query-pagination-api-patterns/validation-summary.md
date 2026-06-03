# Validation Summary: How to Implement Pagination in DynamoDB Queries

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon DynamoDB Query pagination
- DynamoDB `LastEvaluatedKey` and `ExclusiveStartKey`
- DynamoDB `Limit`, `FilterExpression`, and `ScanIndexForward`
- AWS SDK for JavaScript v3
- Node.js `Buffer` and `crypto`
- REST API cursor pagination
- React pagination state management

## Sources Consulted
- Amazon DynamoDB Developer Guide: Paginating table query results in DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html
- Amazon DynamoDB API Reference: Query - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
- AWS SDK for JavaScript v3 Developer Guide: DynamoDB examples - https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- AWS Developer Tools Blog: AWS SDK for JavaScript v2 end-of-support - https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- Node.js Buffer documentation - https://nodejs.org/api/buffer.html
- Node.js Crypto documentation - https://nodejs.org/api/crypto.html

## Issues Found
- The code examples used AWS SDK for JavaScript v2 (`aws-sdk` and `DocumentClient.query().promise()`), which reached end-of-support on September 8, 2025. Updated the examples to use AWS SDK for JavaScript v3 with `DynamoDBClient`, `DynamoDBDocumentClient`, and `QueryCommand`.
- The first JavaScript example used top-level `await` together with CommonJS `require()`, which is not valid as a standalone CommonJS script. Wrapped the usage example in an async function.
- The cursor examples described regular base64 as URL-safe. Standard base64 can contain URL-sensitive characters, so the examples now use Node's `base64url` encoding.
- The HMAC verification example compared digests with a plain string comparison. Updated it to use `crypto.timingSafeEqual()` after checking buffer lengths.
- The filtered pagination example could skip matching items because it fetched more filtered items than it returned, then advanced `LastEvaluatedKey` beyond the trimmed items. Updated the loop to avoid over-fetching returned items for a page.
- Some examples assumed `result.Items` was always present. Updated them to handle an empty or missing `Items` array defensively.
- The page-number cursor cache could treat an end-of-results `null` cursor as the page-1 cursor and return the first page for out-of-range page requests. Updated the example to return an empty page when the requested page is beyond the available result set.
- The security text overstated that a crafted cursor would directly access another customer's data despite the query's partition-key condition. Adjusted the wording to focus on cursor tampering and key probing.

## Review Notes
The DynamoDB pagination model, 1 MB page limit, `LastEvaluatedKey` / `ExclusiveStartKey` flow, `Limit` behavior before filtering, empty filtered pages with `LastEvaluatedKey`, and `ScanIndexForward: false` behavior were verified against AWS documentation. For filtered queries, `hasMore: true` means DynamoDB still has data to evaluate; it does not guarantee the next API call will return matching filtered items.
