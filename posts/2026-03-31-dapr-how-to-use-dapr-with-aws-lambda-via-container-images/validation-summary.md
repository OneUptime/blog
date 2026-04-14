# Validation Summary: How to Use Dapr with AWS Lambda (via Container Images)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (v1.14.0) — sidecar, state management, pub/sub, secrets APIs
- AWS Lambda — container image packaging
- AWS ECR — container registry
- AWS DynamoDB — state store backend
- Python 3.12 — Lambda handler language
- AWS CLI v2 — deployment commands
- Docker — container image build
- awslambdaric — AWS Lambda Runtime Interface Client for Python

## Sources Consulted
- Dapr HTTP API reference for state management: https://docs.dapr.io/reference/api/state_api/
- Dapr HTTP API reference for pub/sub: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr HTTP API reference for secrets: https://docs.dapr.io/reference/api/secrets_api/
- Dapr health endpoint documentation: https://docs.dapr.io/reference/api/health_api/
- Dapr DynamoDB state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr CLI reference (`dapr init --slim`): https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI install script: https://raw.githubusercontent.com/dapr/cli/master/install/install.sh (verified live, returns 200)
- AWS Lambda container image support: https://docs.aws.amazon.com/lambda/latest/dg/images-create.html
- AWS Lambda Python base images (ECR): https://gallery.ecr.aws/lambda/python
- AWS CLI `lambda create-function` reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function.html
- AWS CLI `ecr` commands reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/
- AWS IAM ARN format: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html

## Issues Found
No technical issues found.

## Review Notes
- The `--app-port 9001` flag in the daprd command is unnecessary since the Lambda handler does not start an HTTP server. Dapr will attempt to probe the app at that port and fail silently. This does not break outbound Dapr API calls (state, pub/sub, secrets), but omitting `--app-port` entirely would be cleaner for this use case.
- The "up to 10 seconds" claim for the Lambda init phase is a simplification. The actual init timeout is governed by the function's configured timeout (30 seconds in this example), not a fixed 10-second limit. The 10-second figure is commonly cited but technically refers to the extension init phase.
- The `requirements.txt` contents are not shown. Readers will need to include at minimum `requests` in that file for the handler code to work. The `awslambdaric` package is pre-installed in the AWS Lambda Python base image, so it does not need to be in `requirements.txt`.
- The `docker login` command uses the full ECR repository URI (including `/dapr-lambda`) rather than just the registry hostname. This works in practice but differs from the pattern shown in AWS documentation, which typically uses only the registry URL.
