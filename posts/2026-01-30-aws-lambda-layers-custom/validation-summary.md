# Validation Summary: How to Build AWS Lambda Layers Custom

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda Layers
- AWS CLI
- Python Lambda runtimes and packaging
- Node.js Lambda runtimes and packaging
- Docker and Amazon Linux container images
- FFmpeg in Lambda layers
- AWS SAM
- Terraform AWS provider
- Python logging and API Gateway response helpers

## Sources Consulted
- AWS Lambda documentation: Packaging your layer content - https://docs.aws.amazon.com/lambda/latest/dg/packaging-layers.html
- AWS Lambda documentation: Working with layers for Python Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/python-layers.html
- AWS Lambda documentation: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda documentation: Lambda quotas - https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS CLI Command Reference: publish-layer-version - https://docs.aws.amazon.com/cli/latest/reference/lambda/publish-layer-version.html
- AWS CLI Command Reference: update-function-configuration - https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- AWS SAM documentation: AWS::Serverless::LayerVersion - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-layerversion.html
- Terraform Registry: aws_lambda_layer_version - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_layer_version
- Python documentation: logging - https://docs.python.org/3/library/logging.html
- Python documentation: datetime - https://docs.python.org/3/library/datetime.html

## Issues Found
- The post used `nodejs18.x` and `nodejs20.x` in layer publishing examples. AWS lists both runtimes as deprecated as of this review date, so the examples were updated to `nodejs22.x` and `nodejs24.x`.
- The post described Lambda as running on Amazon Linux 2 generally. Current Lambda runtimes are paired with either Amazon Linux 2 or Amazon Linux 2023, and AWS recommends moving to AL2023-based runtimes. The wording was updated to require matching the target runtime environment.
- The FFmpeg Dockerfile used `amazonlinux:2` for examples that included newer runtimes, and it used `curl` without installing it. The Dockerfile was updated to `amazonlinux:2023`, installs `curl` and `zip`, and uses `dnf`.
- The logging formatter claimed to include fields passed with `extra={...}`, but Python logging adds those keys directly to the `LogRecord`; it does not put them under `record.extra`. The formatter now copies non-built-in record attributes into the JSON log entry.
- The logging formatter used `datetime.utcnow()`. This was replaced with `datetime.now(timezone.utc)` to avoid the deprecated naive UTC datetime pattern in modern Python.
- Size-limit wording was tightened to clarify that Lambda's 250 MB deployment package quota is the unzipped combined package size, including layers.
- A sentence mentioned `boto3` utilities while the dependency install command did not install `boto3`. The wording was changed to "AWS utilities."

## Review Notes
The Terraform snippet references `data.archive_file.api_function`, which is not defined in the excerpt. This is acceptable as a partial infrastructure example, but a full standalone Terraform sample would need to define that archive data source and IAM role resources. The AWS CLI was not installed locally, so CLI syntax was verified against the official AWS CLI command reference instead.
