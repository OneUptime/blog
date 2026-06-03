# Validation Summary: How to Deploy a Web Application with App Runner

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS App Runner
- Amazon ECR
- AWS IAM
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- Amazon CloudWatch and CloudWatch Logs
- Docker
- Node.js and Express
- GitHub Actions

## Sources Consulted
- AWS App Runner availability change: https://docs.aws.amazon.com/apprunner/latest/dg/apprunner-availability-change.html
- AWS App Runner source image services: https://docs.aws.amazon.com/apprunner/latest/dg/service-source-image.html
- AWS App Runner IAM roles: https://docs.aws.amazon.com/apprunner/latest/dg/security_iam_service-with-iam.html
- AWS App Runner environment variables and secrets: https://docs.aws.amazon.com/apprunner/latest/dg/env-variable.html
- AWS App Runner custom domains: https://docs.aws.amazon.com/apprunner/latest/dg/manage-custom-domains.html
- AWS App Runner VPC access: https://docs.aws.amazon.com/apprunner/latest/dg/network-vpc.html
- AWS App Runner CloudWatch metrics: https://docs.aws.amazon.com/apprunner/latest/dg/monitor-cw.html
- AWS App Runner CloudWatch Logs: https://docs.aws.amazon.com/apprunner/latest/dg/monitor-cwl.html
- AWS CLI App Runner create-service reference: https://docs.aws.amazon.com/cli/latest/reference/apprunner/create-service.html
- AWS CLI App Runner update-service reference: https://docs.aws.amazon.com/cli/latest/reference/apprunner/update-service.html
- AWS CLI App Runner create-auto-scaling-configuration reference: https://docs.aws.amazon.com/cli/latest/reference/apprunner/create-auto-scaling-configuration.html
- AWS CLI App Runner create-vpc-connector reference: https://docs.aws.amazon.com/cli/latest/reference/apprunner/create-vpc-connector.html
- AWS CLI App Runner describe-custom-domains reference: https://docs.aws.amazon.com/cli/latest/reference/apprunner/describe-custom-domains.html
- Amazon ECR CLI examples: https://docs.aws.amazon.com/cli/latest/userguide/cli_ecr_code_examples.html
- AWS Secrets Manager secret ARN format: https://docs.aws.amazon.com/secretsmanager/latest/userguide/whats-in-a-secret.html
- npm ci documentation from local npm 10.9.4 help output

## Issues Found
- AWS App Runner is no longer open to new AWS customers as of April 30, 2026. Added a short availability note while preserving the tutorial for existing customers.
- Replaced `npm ci --only=production` with `npm ci --omit=dev`, which is the current npm option documented for omitting development dependencies.
- The instance role policy did not grant access to Secrets Manager or SSM Parameter Store even though the App Runner service referenced runtime secrets. Added `secretsmanager:GetSecretValue` and `ssm:GetParameters` permissions.
- The example Secrets Manager ARN omitted the generated six-character suffix used in full secret ARNs. Updated the service configuration and IAM resource pattern accordingly.
- The App Runner `create-service` and `update-service` JSON examples used lower camel-case member names. Updated them to the AWS CLI/API member casing shown in official CLI documentation.
- The custom-domain instructions only surfaced certificate validation records. Updated the query and text to include the App Runner DNS target record needed to route the custom domain to the service.
- The CloudWatch command used BSD/macOS `date -v-1H`, which fails on common GNU/Linux environments. Replaced it with GNU `date -d '1 hour ago'`.
- The metrics list used `RequestCount`, but App Runner publishes the request count metric as `Requests`. Corrected the metric name.

## Review Notes
The App Runner commands are suitable for existing App Runner customers. New AWS customers should evaluate AWS's recommended successor path, Amazon ECS Express Mode, because App Runner is closed to new customers and AWS does not plan to introduce new App Runner features.
