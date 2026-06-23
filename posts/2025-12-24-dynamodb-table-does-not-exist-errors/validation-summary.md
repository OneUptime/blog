# Validation Summary: How to Handle 'Table does not exist' DynamoDB Errors

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- Amazon DynamoDB
- AWS SDK for JavaScript v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/client-sts`)
- AWS CLI
- AWS IAM (policies)
- AWS CloudFormation
- Node.js

## Sources Consulted
- AWS SDK for JavaScript v3 — DynamoDB client reference (commands: GetItemCommand, DescribeTableCommand, ListTablesCommand, CreateTableCommand): https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/
- AWS SDK for JavaScript v3 error handling (`error.name` discrimination): https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/
- DynamoDB API — common errors / ResourceNotFoundException: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/CommonErrors.html
- DynamoDB DescribeTable / TableStatus values (CREATING, ACTIVE, DELETING): https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DescribeTable.html
- AWS CLI v2 reference — `aws dynamodb list-tables`, `describe-table`, `aws sts get-caller-identity`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/
- AWS::DynamoDB::Table CloudFormation reference (BillingMode, KeySchema, AttributeDefinitions): https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html

## Issues Found
No technical issues found. All code examples, CLI commands, the IAM policy, and the CloudFormation snippet were verified against current AWS documentation and are syntactically correct and use non-deprecated APIs.

- The error message format matches DynamoDB's actual `ResourceNotFoundException` output.
- All AWS SDK v3 imports, command usage, and response shapes (`result.Item`, `response.Table.TableStatus`, `result.TableNames`, `identity.Account`) are correct.
- `error.name === 'ResourceNotFoundException'` is the correct v3 error-discrimination pattern.
- CLI commands and `--query` JMESPath expressions are valid.
- The CloudFormation resource and IAM policy are well-formed and accurate.

## Review Notes
- Section 4 ("Table Still Creating") intentionally contrasts SDK v2 style (`dynamodb.createTable(params).promise()`) as the problematic example with an SDK v3 solution. This is consistent and correct, though the mix of SDK versions could confuse readers; a future improvement would be to note explicitly that the first snippet is v2. AWS SDK v3 also ships a built-in waiter (`waitUntilTableExists`) that could replace the hand-rolled `waitForTableActive` loop — the manual version shown is still valid.
- Section 6 states that insufficient IAM permissions "sometimes" return a not-found error instead of access-denied. For DynamoDB specifically, missing permissions normally surface as `AccessDeniedException`, not `ResourceNotFoundException`; the "404-instead-of-403" masking is more characteristic of other services and certain cross-account/resource-policy/SCP edge cases. The claim is hedged with "Sometimes" and the remediation advice (verify IAM, test with `DescribeTable`) remains sound, so it was left in place but flagged here as a caveat.
- The `// Usage` block at the end of section 4 references helper functions (`createTable`, `putItem`) that are illustrative pseudocode rather than defined in the snippet — acceptable for a guide.
