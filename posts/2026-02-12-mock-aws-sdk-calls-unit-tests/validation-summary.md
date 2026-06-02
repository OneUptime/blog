# Validation Summary: How to Mock AWS SDK Calls in Unit Tests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS SDK for Python (Boto3)
- botocore Stubber
- Python unittest.mock
- botocore ClientError
- AWS SDK for JavaScript v3
- aws-sdk-client-mock
- Jest
- Amazon S3
- Amazon DynamoDB
- Amazon SQS

## Sources Consulted
- Python unittest.mock documentation: https://docs.python.org/3/library/unittest.mock.html
- Boto3 S3 get_object documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/get_object.html
- Boto3 S3 delete_object documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/delete_object.html
- Boto3 S3 list_buckets documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/s3/client/list_buckets.html
- botocore Stubber reference: https://docs.aws.amazon.com/botocore/latest/reference/stubber.html
- AWS SDK for JavaScript v3 DynamoDB examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html
- AWS Developer Tools Blog on aws-sdk-client-mock: https://aws.amazon.com/blogs/developer/mocking-modular-aws-sdk-for-javascript-v3-in-unit-tests/
- aws-sdk-client-mock documentation: https://github.com/m-radzikowski/aws-sdk-client-mock
- Referenced OneUptime LocalStack guide: https://oneuptime.com/blog/post/2026-02-12-localstack-test-aws-services-locally/view
- Referenced OneUptime moto guide: https://oneuptime.com/blog/post/2026-02-12-moto-mocking-aws-services-python-tests/view

## Issues Found
- The S3 error-path example used `delete_object` to demonstrate `NoSuchKey` for missing objects. S3 delete behavior is generally idempotent, and the Boto3 `get_object` API documents `NoSuchKey` as an exception. Changed the example to read an S3 object with `get_object`, return `None` for `NoSuchKey`, and re-raise other `ClientError` values.
- The botocore Stubber `list_buckets` example used ISO timestamp strings for `CreationDate`. Boto3 models this field as `datetime`, and Stubber validates responses against the service model. Changed the stubbed response to use timezone-aware `datetime` values.
- Later standalone Python and JavaScript snippets referenced `json`, `MagicMock`, and `PutObjectCommand` without imports. Added the missing imports so the examples are runnable as shown.
- The JavaScript section described the approach as module-level mocking, but the example uses `aws-sdk-client-mock` to mock SDK clients. Updated the wording to match the demonstrated approach.

## Review Notes
The examples are unit-test oriented and intentionally omit real AWS credentials, regions, and test runner setup. In a full project, patch targets should use the namespace where the dependency is looked up, as described in the Python `unittest.mock` documentation.
