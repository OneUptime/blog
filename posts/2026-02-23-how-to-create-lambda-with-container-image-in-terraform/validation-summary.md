# Validation Summary: How to Create Lambda with Container Image in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS Lambda (container image package type)
- Amazon ECR (repositories and lifecycle policies)
- Docker (AWS Lambda base images for Node.js, Python, Go)
- AWS IAM (roles, policies)
- AWS API Gateway v2 (HTTP API)
- AWS VPC (subnets, security groups)
- npm
- Go custom runtime on Lambda

## Sources Consulted
- Terraform AWS Provider — `aws_ecr_repository`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- Terraform AWS Provider — `aws_ecr_lifecycle_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_lifecycle_policy
- Terraform AWS Provider — `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS Docs — Deploy Node.js Lambda functions with container images: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html
- AWS Docs — Deploy Python Lambda functions with container images: https://docs.aws.amazon.com/lambda/latest/dg/python-image.html
- AWS Blog — Amazon Linux 2023 runtime for AWS Lambda: https://aws.amazon.com/blogs/compute/introducing-the-amazon-linux-2023-runtime-for-aws-lambda/
- npm CLI docs (npm ci): https://docs.npmjs.com/cli/v11/commands/npm-ci/
- AWS Lambda quotas (10 GB image size, 250 MB unzipped zip): https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html

## Issues Found

1. **Invalid `lifecycle_policy_policy` argument on `aws_ecr_repository`** — The original first ECR resource embedded a `lifecycle_policy_policy = jsonencode({...})` block. This is not a valid argument on `aws_ecr_repository` (no such field exists; lifecycle policies must always be defined via the separate `aws_ecr_lifecycle_policy` resource). A `terraform plan` would have failed. Fix: removed the bogus inline block from `aws_ecr_repository` and kept the existing, correct `aws_ecr_lifecycle_policy "lambda_app"` resource that already followed it. Updated its comment from "alternative method" to "to clean up old images" since it is now the only method shown.

2. **Deprecated npm flag `--only=production`** — The Node.js Dockerfile used `RUN npm ci --only=production`. The `--only=production` (and `--production`) flag has been deprecated since npm 8.3.0 in favor of `--omit=dev`. Fix: changed to `RUN npm ci --omit=dev`.

## Review Notes

- The Node.js Dockerfile uses `CMD ["src/index.handler"]` with `COPY src/ ${LAMBDA_TASK_ROOT}/src/`. This is consistent — the handler module path resolves to `${LAMBDA_TASK_ROOT}/src/index.js` — and matches the `image_config.command = ["src/index.handler"]` override in the Lambda resource. The more common AWS-documented pattern places the handler file at the task root (`CMD ["index.handler"]`), but the post's nested form is internally consistent and works.
- `public.ecr.aws/lambda/python:3.11` is correctly based on Amazon Linux 2, so the `yum install` command is appropriate. If/when the post is updated to Python 3.12+, the base image switches to Amazon Linux 2023 and `yum` would need to become `dnf` / `microdnf`.
- The 10 GB container image size limit and 250 MB unzipped zip-deployment limit cited in the introduction are both accurate per current AWS Lambda quotas.
- `image_config` arguments (`command`, `entry_point`, `working_directory`) and `architectures = ["arm64"]` are all valid per the Terraform AWS provider docs.
- The HTTP API setup (`aws_apigatewayv2_api`, `aws_apigatewayv2_integration` with `payload_format_version = "2.0"`, `$default` route and stage, `auto_deploy = true`) is correct.
- Pinning base image versions and image tags (instead of relying on `:latest`) would be worth a stronger callout for production use, but is already mentioned in Best Practices.
