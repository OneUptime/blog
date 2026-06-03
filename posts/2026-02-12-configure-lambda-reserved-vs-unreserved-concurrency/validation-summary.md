# Validation Summary: How to Configure Lambda Reserved vs Unreserved Concurrency

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Lambda
- Lambda reserved concurrency
- Lambda provisioned concurrency
- AWS CLI
- Amazon CloudWatch metrics and alarms
- AWS Service Quotas
- Python
- psycopg2 PostgreSQL connection pooling

## Sources Consulted
- AWS Lambda Developer Guide: Understanding Lambda function scaling - https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html
- AWS Lambda Developer Guide: Configuring reserved concurrency - https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html
- AWS Lambda Developer Guide: Configuring provisioned concurrency - https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- AWS Lambda Developer Guide: Monitoring concurrency - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-concurrency.html
- AWS Lambda Developer Guide: Lambda quotas - https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS General Reference: AWS Lambda endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/lambda-service.html
- AWS CLI Command Reference: put-function-concurrency - https://docs.aws.amazon.com/cli/latest/reference/lambda/put-function-concurrency.html
- AWS CLI Command Reference: put-provisioned-concurrency-config - https://docs.aws.amazon.com/cli/latest/reference/lambda/put-provisioned-concurrency-config.html
- AWS CLI Command Reference: put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI Command Reference: request-service-quota-increase - https://docs.aws.amazon.com/cli/latest/reference/service-quotas/request-service-quota-increase.html
- AWS Lambda Developer Guide: Best practices for working with Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- Psycopg 2.9 documentation: psycopg2.pool - https://www.psycopg.org/docs/pool.html

## Issues Found
- The post incorrectly treated the 100-unit unreserved concurrency minimum as a separate buffer subtracted from the unreserved runtime pool. Updated the diagram, formula, examples, and strategy calculation so unreserved concurrency is `Account Limit - Total Reserved`, while AWS still requires at least 100 units to remain unreserved.
- The post stated that provisioned concurrency is a subset of reserved concurrency. Updated this to explain that provisioned concurrency can be used with reserved concurrency and cannot exceed reserved concurrency when both are configured, but can also be configured without reserved concurrency.
- The provisioned concurrency comparison said it eliminates cold starts. Updated the wording to say it reduces cold starts for provisioned capacity, which is more accurate because only invocations using the configured provisioned concurrency on the right version or alias avoid cold starts.
- The database example claimed a strict total max connection count. Updated the comment to say active Lambda environments can use up to the reserved concurrency count, avoiding an overbroad guarantee about all possible idle or recycled execution environments.
- The post described 1,000 concurrent executions as the default for accounts. Updated the wording to note that many accounts use a 1,000 quota, but AWS documents that new accounts can start with reduced concurrency quotas.
- The over-reserving warning said the unreserved pool can hit zero. Updated it to reflect AWS's required 100-unit unreserved minimum while preserving the warning that unreserved functions can throttle when they exhaust the shared pool.

## Review Notes
The AWS CLI command names and flags in the post match the current AWS CLI command reference. The Service Quotas command shape is correct; AWS documentation recommends discovering service and quota codes with Service Quotas APIs, so the exact quota code should still be checked in the target account or Region before running the example in production.
