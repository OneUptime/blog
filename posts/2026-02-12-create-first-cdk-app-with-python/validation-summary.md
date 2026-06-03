# Validation Summary: How to Create Your First CDK App with Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- Python
- AWS Lambda
- Amazon DynamoDB
- Amazon API Gateway REST API
- Amazon CloudWatch Logs
- pip and Python virtual environments

## Sources Consulted
- AWS CDK prerequisites: https://docs.aws.amazon.com/cdk/v2/guide/prerequisites.html
- AWS CDK `cdk init` command reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-init.html
- AWS CDK Python guide: https://docs.aws.amazon.com/cdk/v2/guide/work-with-cdk-python.html
- AWS CDK deployment guide: https://docs.aws.amazon.com/cdk/v2/guide/deploy.html
- AWS CDK Python API reference for DynamoDB `TableOptions`: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_dynamodb/TableOptions.html
- AWS CDK Python API reference for Lambda `Function`: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_lambda/Function.html
- AWS CDK Python API reference for Lambda `Runtime`: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_lambda/Runtime.html
- Amazon DynamoDB `GetItem` API reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_GetItem.html
- Python 3.12 "What's New" deprecations: https://docs.python.org/3.12/whatsnew/3.12.html
- PyPI release information for `aws-cdk-lib`: https://pypi.org/project/aws-cdk-lib/

## Issues Found
- The prerequisites said Python 3.8 or later and omitted Node.js. Current AWS CDK prerequisites require Node.js 22.x or later for all CDK languages and Python 3.9 or later with pip and virtualenv, so the prerequisite sentence was updated.
- The DynamoDB table used a composite primary key of `id` plus `created_at`, but the Lambda handler called `get_item` and `delete_item` with only `id`. DynamoDB requires all primary key attributes for a composite key. The table was changed to use `id` as the only table primary key, keeping `created_at` as the GSI sort key.
- The stack used the deprecated `point_in_time_recovery=True` CDK property. It was replaced with `point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(point_in_time_recovery_enabled=True)`.
- The Lambda function used the deprecated `log_retention` property. It was replaced with an explicit `logs.LogGroup` passed through the `log_group` property.
- The API registered a `PUT /items/{id}` method but the Lambda handler did not implement `PUT`, so the advertised CRUD flow was incomplete. A `PUT` branch was added.
- The Lambda handler used `datetime.utcnow()`, which is deprecated in Python 3.12. It was replaced with `datetime.now(timezone.utc).isoformat()`.
- The `requirements.txt` example pinned `aws-cdk-lib==2.170.0`, which is outdated as of this review. It was updated to `aws-cdk-lib==2.257.0`, the current PyPI release found during validation.

## Review Notes
The corrected stack was synthesized successfully with `aws-cdk-lib==2.257.0` and `constructs>=10.0.0,<11.0.0` using an isolated `pip --target` install. The local machine could not create a virtual environment with `python3 -m venv` because `ensurepip`/`python3.12-venv` is not installed, so verification used `pip --target` instead.
