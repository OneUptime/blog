# Validation Summary: How to Build Serverless Functions with Python on AWS Lambda

## Status
validated

## Post Type
Tutorial / Guide (hands-on, code-heavy walkthrough of building and deploying Python AWS Lambda functions with SAM)

## Technologies Covered
- Python 3.12
- AWS Lambda
- AWS API Gateway (REST API)
- AWS SAM (Serverless Application Model)
- Amazon DynamoDB (boto3 resource API)
- Amazon SQS (with partial batch failure / ReportBatchItemFailures)
- Amazon S3 events
- Amazon SNS
- AWS SSM Parameter Store
- boto3
- Pydantic v2
- pytest + moto (AWS mocking)

## Sources Consulted
- AWS Lambda Developer Guide — execution environment / cold start lifecycle: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html
- AWS Lambda memory & CPU allocation (128 MB–10,240 MB, CPU scales with memory): https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html
- AWS Lambda SQS partial batch responses (ReportBatchItemFailures / batchItemFailures): https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
- AWS SAM resource reference — AWS::Serverless::Function (ProvisionedConcurrencyConfig requires AutoPublishAlias): https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- boto3 DynamoDB conditions / data types (float types not supported, use Decimal): https://boto3.amazonaws.com/v1/documentation/api/latest/reference/customizations/dynamodb.html
- Pydantic docs — EmailStr requires the email-validator package (`pip install 'pydantic[email]'`): https://docs.pydantic.dev/latest/api/networks/ and https://docs.pydantic.dev/latest/install/
- moto docs — V5 introduced the single unified `@mock_aws` decorator (replacing service-specific decorators): https://docs.getmoto.org/en/latest/docs/getting_started.html and https://github.com/getmoto/moto/issues/7198

## Issues Found
1. **`EmailStr` dependency missing in `requirements.txt`** — The API handler uses `from pydantic import ... EmailStr`, but Pydantic's `EmailStr` requires the optional `email-validator` package, which `pydantic>=2.5.0` does not pull in by itself. Without it, importing the model raises `ImportError: email-validator is not installed`. Changed the requirement to `pydantic[email]>=2.5.0` so the extra is installed.

2. **`moto>=4.2.0` incompatible with the test code** — The unit tests use `from moto import mock_aws`, but the unified `mock_aws` decorator was only introduced in moto 5.0 (moto 4.x exposes service-specific decorators like `mock_dynamodb` instead). Bumped the dev requirement to `moto>=5.0.0` to match the code shown.

3. **DynamoDB float storage would raise `TypeError`** — In the SQS handler, an order `total` (e.g. `99.99`) was parsed via `json.loads(...)` (producing a Python `float`) and written to DynamoDB with the boto3 resource API, which rejects floats (`Float types are not supported. Use Decimal types instead.`). This contradicts the documented `test_process_order_created` test, which asserts no batch failures. Fixed by parsing the SQS body with `json.loads(..., parse_float=Decimal)` (and added `from decimal import Decimal`), the standard boto3/DynamoDB pattern.

4. **`ExpressionAttributeNames=None` rejected by boto3** — In `update_user`, the update was called with `ExpressionAttributeNames=expression_names if expression_names else None`. On the age-only update path `expression_names` is empty, so `None` is passed, which boto3 rejects with a `ParamValidationError`. Rebuilt the call to assemble kwargs and only include `ExpressionAttributeNames` when it is populated.

5. **`ProvisionedConcurrencyConfig` missing required `AutoPublishAlias`** — The performance-tuning SAM snippet defined `CriticalApiFunction` with `ProvisionedConcurrencyConfig` but no `AutoPublishAlias`. SAM validation fails in this case because provisioned concurrency applies to a published version/alias. Added `AutoPublishAlias: live`.

6. **Outdated CPU/memory comment** — The comment `MemorySize: 3008  # Maximum for proportional CPU` reflected the pre-2020 Lambda limit. Lambda now supports up to 10,240 MB (~6 vCPUs) with CPU scaling proportionally. Updated the comment to reflect current limits (kept the example value at 3008 MB).

## Review Notes
- The core handler patterns (init-outside-handler for warm reuse, structured logging with request IDs, API Gateway REST event shape using `httpMethod`/`path`, SQS partial batch failures via `batchItemFailures`, S3 event record parsing with `unquote_plus`) are all accurate and current.
- The SAM template is well-formed: `python3.12` runtime, `arm64` (Graviton) architecture, `PAY_PER_REQUEST` DynamoDB, `FunctionResponseTypes: ReportBatchItemFailures` for the SQS event, and the `samconfig.toml` `version = 0.1` are all valid.
- The mock `lambda_context.memory_limit_in_mb = 256` is an `int`; in the real Lambda runtime this attribute is a string. Harmless in tests but worth noting for anyone copying the mock for stricter assertions.
- `python-json-logger` is listed in requirements but not exercised in the shown code; not an error, just unused in the examples.
- Pydantic union syntax (`int | None`) is valid given the stated Python 3.12 runtime.
