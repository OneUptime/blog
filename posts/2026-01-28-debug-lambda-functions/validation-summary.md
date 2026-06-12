# Validation Summary: How to Debug Lambda Functions

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- AWS Lambda
- Amazon CloudWatch Logs and CloudWatch Logs Insights
- AWS X-Ray (distributed tracing)
- AWS SAM CLI (local Lambda emulation)
- Node.js (logging, error handling, memory monitoring with `v8` / `process.memoryUsage()`)
- Python (`logging` module, `aws-xray-sdk` for Python)
- Terraform (HCL) — `aws_lambda_function`, `aws_cloudwatch_query_definition`, `aws_cloudwatch_metric_alarm`, `aws_cloudwatch_log_group`, IAM
- VS Code launch configurations (Node.js inspector protocol)
- API Gateway REST event format

## Sources Consulted
- AWS Lambda runtime environment variables docs (`AWS_LAMBDA_FUNCTION_NAME`, `AWS_LAMBDA_FUNCTION_VERSION`, `AWS_LAMBDA_FUNCTION_MEMORY_SIZE`)
- AWS X-Ray SDK for Python — segments/annotations/metadata: https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-python-segment.html
- AWS X-Ray SDK for Python source (`aws_xray_sdk/core/models/entity.py`) — confirmed `add_exception(exception, stack, remote=False)` signature
- AWS X-Ray SDK for Node.js docs — `captureAWS`, `captureHTTPsGlobal`, custom subsegments
- AWS SAM CLI command reference — `sam local invoke`, `sam local start-api`, `-d/--debug-port` flag
- CloudWatch Logs Insights query syntax reference — `fields`, `filter`, `parse`, `stats`, `bin()`, `@type`, `@duration`, `@maxMemoryUsed`, `@memorySize`
- Terraform AWS provider docs — `aws_cloudwatch_query_definition`, `aws_cloudwatch_metric_alarm`, `aws_lambda_function.tracing_config`
- AWS managed policy ARN reference — `arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess`
- Python `logging` module docs: https://docs.python.org/3/library/logging.html — verified that `extra=` kwargs are merged directly onto LogRecord `__dict__`
- Python `datetime` docs — `datetime.utcnow()` deprecated since 3.12; recommended replacement is `datetime.now(timezone.utc)`
- Node.js `v8.getHeapStatistics()` and `process.memoryUsage()` docs

## Issues Found

1. **Python structured logger never picked up `extra` fields.** The original code used `if hasattr(record, 'extra'): log_record.update(record.extra)`. Python's `logging` module merges keys from the `extra=` kwarg directly into `LogRecord.__dict__`; it does not create a `record.extra` attribute. The check is therefore always false in normal use, so user-supplied extras would silently disappear from the JSON output. Replaced with an iteration over `record.__dict__` that skips the standard `LogRecord` attribute names, which is the conventional way to surface `extra` fields in JSON formatters.

2. **Python `datetime.utcnow()` is deprecated.** Lambda's Python runtimes now include 3.12 and 3.13, where `datetime.utcnow()` raises a `DeprecationWarning` and is scheduled for removal. Changed to `datetime.now(timezone.utc)` and added `timezone` to the `datetime` import. Output format is unchanged in practice (still ISO-8601), but it is now timezone-aware and future-proof.

3. **Python X-Ray `segment.add_exception(e)` missing required `stack` argument.** Verified against the `aws-xray-sdk-python` source: the method signature is `add_exception(self, exception, stack, remote=False)` — `stack` is positional and required. Calling it with only the exception raises `TypeError`. Fixed to `segment.add_exception(e, traceback.extract_stack())` and added the necessary `import traceback` (also added `import json`, which the existing `json.dumps(result)` call in the same snippet already required but had not been imported).

## Review Notes

- **AWS SDK v2 for Node.js (`require('aws-sdk')`)** in the X-Ray section reached end-of-support on 2024-09-08 and is no longer bundled in the Lambda Node.js 18.x+ managed runtimes. The example still works if the SDK is bundled in the deployment package, but new code should migrate to AWS SDK v3 (`@aws-sdk/client-*`) and use `AWSXRay.captureAWSv3Client()` instead of `captureAWS()`. Left as-is because the post is about debugging patterns rather than SDK choice, but readers should be aware.
- **AWS X-Ray itself** is entering maintenance mode on 2026-02-25 per AWS's published timeline. The AWS-recommended forward path is OpenTelemetry instrumentation with the AWS Distro for OpenTelemetry. The X-Ray examples still work but represent a technology AWS is transitioning away from.
- **CloudWatch Logs Insights query language** is fenced as ` ```sql ` — it isn't really SQL, but using `sql` as the syntax-highlighting hint for Logs Insights queries is a common convention and produces reasonable highlighting, so left untouched.
- **`aws-sdk` v2 `.promise()` pattern** in the DynamoDB example will likewise need rewriting for SDK v3 (v3 returns promises natively).
- **`brew install aws-sam-cli`** is the current, correct Homebrew formula path (the legacy `aws/tap/aws-sam-cli` tap has been retired into the main core formulae).
- **API Gateway test event** is the REST API (v1) format; HTTP API (v2) payload format is different (`requestContext.http.method`, `routeKey`, etc.). The post does not call this out, but the example is internally consistent.
- The Node.js logger's `shouldLog` comparison treats `LOG_LEVEL` as a string key into `levels`; if an operator sets `LOG_LEVEL=trace` (or any value not in the map) the result of `levels[LOG_LEVEL]` would be `undefined` and `>=` would be `false`, silencing all logs. Not strictly a bug — the documented levels work — but readers may want to add a fallback.
