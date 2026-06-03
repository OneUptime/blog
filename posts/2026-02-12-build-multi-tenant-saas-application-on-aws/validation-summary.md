# Validation Summary: How to Build a Multi-Tenant SaaS Application on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS SaaS architecture
- Amazon Cognito
- AWS CLI
- AWS SDK for JavaScript v3
- Amazon DynamoDB
- Amazon RDS for PostgreSQL
- PostgreSQL Row Level Security
- Amazon CloudWatch embedded metric format
- AWS Lambda
- Node.js

## Sources Consulted
- AWS Well-Architected SaaS Lens, Silo, Pool, and Bridge Models: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html
- AWS SaaS Tenant Isolation Strategies, Bridge Model: https://docs.aws.amazon.com/whitepapers/latest/saas-tenant-isolation-strategies/the-bridge-model.html
- AWS CLI `create-user-pool` command reference: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool.html
- AWS CLI `create-user-pool-client` command reference: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool-client.html
- Amazon Cognito app client settings documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html
- Amazon Cognito security best practices for app client secrets: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-security-best-practices.html
- Amazon Cognito pre-token generation Lambda trigger documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html
- AWS SDK for JavaScript v3 DynamoDB `PutCommand` reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/Class/PutCommand/
- Amazon DynamoDB `PutItem` API reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PutItem.html
- Amazon DynamoDB condition expression documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
- PostgreSQL Row Security Policies documentation: https://www.postgresql.org/docs/17/ddl-rowsecurity.html
- PostgreSQL `CREATE POLICY` documentation: https://www.postgresql.org/docs/current/sql-createpolicy.html
- PostgreSQL `SET` documentation: https://www.postgresql.org/docs/16/sql-set.html
- Amazon CloudWatch embedded metric format specification: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html

## Issues Found
- The Cognito app client command created a client secret for `saas-web-app`. Amazon Cognito documents client secrets as appropriate for server-side and machine-to-machine clients, while public browser or mobile clients should not embed secrets. Changed `--generate-secret` to `--no-generate-secret`.
- The DynamoDB `put` example spread caller-supplied `item` fields after setting `pk` and `sk`, allowing `item.pk` to override the tenant-scoped partition key. Moved `...item` before the authoritative tenant key fields.
- The DynamoDB condition expression compared `pk` to the intended tenant key, but conditional expressions are evaluated against the item addressed by the request key and would not prevent a malicious caller from changing the request key if `item.pk` was allowed to override it. Changed the condition to check the stored `tenantId` after making the tenant key authoritative.
- The PostgreSQL RLS snippet used session-level `SET`, which can leak tenant context across requests when application connection pools reuse database sessions. Changed the example to use `BEGIN` with `SET LOCAL`, whose effect lasts only for the current transaction.
- The rate-limiting snippet imported `DynamoDBDocumentClient` and `GetCommand` but did not use them. Removed the unused imports from the example.

## Review Notes
The Cognito pre-token trigger example uses the version 1 `claimsOverrideDetails` shape, which is still documented for ID token customization. If the application authorizes APIs with Cognito access tokens instead of ID tokens, a version 2 or later pre-token trigger and an eligible user-pool feature plan are needed to add custom access-token claims.
