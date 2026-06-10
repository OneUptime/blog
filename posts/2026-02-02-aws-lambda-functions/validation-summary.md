# Validation Summary: How to Create AWS Lambda Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Python 3.12 (Lambda runtime)
- AWS CLI
- boto3 (S3, DynamoDB, Secrets Manager clients)
- AWS SAM (Serverless Application Model)
- AWS CloudFormation (SAM template syntax)
- API Gateway (REST API event payload v1)
- Amazon S3 (event notifications)
- Amazon SQS (event source mappings with partial batch failure reporting)
- Amazon DynamoDB
- AWS Secrets Manager
- AWS Lambda Layers
- AWS Lambda Provisioned Concurrency
- Amazon CloudWatch Logs & Logs Insights
- ARM64 / AWS Graviton2 architecture
- Python `functools.lru_cache`

## Sources Consulted
- AWS Lambda Developer Guide — Python handler basics: https://docs.aws.amazon.com/lambda/latest/dg/python-handler.html
- AWS CLI v2 `lambda invoke` reference (binary format requirement): https://docs.aws.amazon.com/cli/latest/reference/lambda/invoke.html
- AWS Lambda S3 event notification payload format: https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html
- AWS Lambda SQS partial batch response (`batchItemFailures` / `ReportBatchItemFailures`): https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS Lambda Layers (max 5 layers per function, Python `python/` directory structure): https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html
- AWS Lambda runtimes (Python 3.12, Node.js 20.x current support): https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Provisioned Concurrency: https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- AWS SAM template specification (`AWS::Serverless::Function`, `AWS::Serverless::Api`, `DynamoDBCrudPolicy`): https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- Python `functools.lru_cache` documentation (cache persists on function object): https://docs.python.org/3/library/functools.html
- AWS CloudWatch Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html

## Issues Found

1. **Incorrect `lru_cache` behavior comment** (secrets.py example).
   - **Was:** `"Uses lru_cache to avoid repeated API calls during the same Lambda execution. Cache is cleared between invocations."`
   - **Why wrong:** The `@lru_cache` decorator stores the cache on the function object itself at module level. Because Lambda keeps module-level state alive across warm invocations within the same execution environment, the cache actually persists across invocations and is only discarded on cold start (when a new execution environment is initialized).
   - **Fix:** Replaced with `"The cache persists for the lifetime of the execution environment (across warm invocations) and is only cleared on cold starts."`

2. **Missing `--cli-binary-format raw-in-base64-out` in `aws lambda invoke` example.**
   - **Was:** `aws lambda invoke --function-name my-first-lambda --payload '{"name": "Lambda"}' response.json`
   - **Why wrong:** AWS CLI v2 (which is the current default) treats `--payload` as base64-encoded by default. Passing a raw JSON string without `--cli-binary-format raw-in-base64-out` will produce an `Invalid base64` error. The AWS CLI v2 reference explicitly documents this requirement.
   - **Fix:** Added `--cli-binary-format raw-in-base64-out` flag plus an explanatory comment noting it is required in AWS CLI v2.

## Review Notes
- The "20% better price/performance" claim for ARM64/Graviton2 is conservative; AWS marketing materials cite up to 34% better price performance. Conservative wording is acceptable.
- The API Gateway handler example targets the REST API / HTTP API v1 payload format (`httpMethod`, `path`). HTTP API v2 uses a different structure (`requestContext.http.method`). The post does not call this out, but the example is correct for v1, which is fine as an introduction.
- Python 3.13 is also a supported Lambda runtime as of the review date; the post sticks with 3.12 which is still fully supported and not deprecated.
- The `--qualifier prod` in the `put-provisioned-concurrency-config` example assumes a `prod` alias already exists. This is reasonable for illustrative documentation and was left as-is.
- The S3 event handler correctly uses `urllib.parse.unquote_plus` — S3 event keys URL-encode spaces as `+`, so `unquote_plus` (not `unquote`) is the right choice.
- The SQS `batchItemFailures` response format and the `ReportBatchItemFailures` event-source-mapping reference are correct.
- The SAM template, CloudFormation intrinsic functions (`!Ref`, `!Sub`, `!GetAtt`), `DynamoDBCrudPolicy` policy template, and `PAY_PER_REQUEST` billing mode are all valid.
