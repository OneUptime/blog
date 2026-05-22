# Validation Summary: How to Package Lambda Code with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Lambda
- AWS S3
- Amazon ECR
- Docker
- Python pip
- npm
- ZIP deployment packages

## Sources Consulted
- Terraform AWS provider `aws_lambda_function` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform Archive provider `archive_file` data source documentation: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- AWS Lambda quotas documentation: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda container image documentation: https://docs.aws.amazon.com/lambda/latest/dg/images-create.html
- AWS Lambda Python container image documentation: https://docs.aws.amazon.com/lambda/latest/dg/python-image.html
- AWS CLI ECR examples for `get-login-password`: https://docs.aws.amazon.com/cli/latest/userguide/cli_ecr_code_examples.html
- Docker CLI `docker login` documentation: https://docs.docker.com/reference/cli/docker/login/
- npm `ci` command documentation: https://docs.npmjs.com/cli/v11/commands/npm-ci/
- pip `install` command documentation: https://pip.pypa.io/en/stable/cli/pip_install/

## Issues Found
- The pre-built ZIP example set `source_code_hash` to a raw source hash, and it ignored dependency-only trigger changes. Changed it to a base64 SHA-256 value derived from all build triggers so Terraform sees code and dependency changes.
- The Node.js example used `npm ci --production`, which npm documents as a deprecated alias for omitting dev dependencies. Changed it to `npm ci --omit=dev`.
- The container image example pushed and deployed `latest`. Lambda resolves image tags to digests, and Terraform will not update the function if the `image_uri` string stays the same. Changed the example to tag images with a content hash and use that tag in `image_uri`.
- The ECR login command passed the repository URL, which includes a path component. Docker documents that registry login addresses should be hostnames without path components. Changed it to log in to the registry host derived from the repository URL.
- The reusable module returned a raw trigger hash as `source_code_hash` for dependency builds. Changed it to a base64 SHA-256 value.
- The S3 ZIP package limit stated that S3-based uploads are limited to 50MB compressed. AWS Lambda allows larger ZIP files through S3, while the extracted deployment package size is limited to 250MB. Updated the limit wording.

## Review Notes
- The examples are technically valid tutorial snippets, but production pipelines should prefer building Lambda artifacts before Terraform planning when possible. This avoids local provisioner brittleness and makes artifact hashes map directly to immutable build outputs.
