# Validation Summary: How to Deploy a Go Application with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Go (Golang) — compiled binary deployment
- AWS Lambda (`provided.al2023` custom runtime)
- AWS API Gateway v2 (HTTP API)
- AWS ECS Fargate
- AWS ECR
- AWS Secrets Manager
- AWS CloudWatch (metric alarms)
- AWS SNS (alarm actions)
- AWS IAM (roles)
- `hashicorp/archive` Terraform provider (`archive_file`)

## Sources Consulted
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda — Building Go functions with provided runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-golang.html
- AWS Lambda runtime deprecation policy (go1.x EOL Dec 31, 2023): https://docs.aws.amazon.com/lambda/latest/dg/runtime-support-policy.html
- AWS Lambda SnapStart supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html
- Terraform AWS provider — `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider — `aws_apigatewayv2_api`, `aws_apigatewayv2_integration`, `aws_apigatewayv2_route`, `aws_apigatewayv2_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
- Terraform AWS provider — `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Terraform AWS provider — `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform `archive_file` data source: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- AWS API Gateway v2 payload format reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS ECS task definition `healthCheck` parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS Lambda `Duration` CloudWatch metric (reported in milliseconds): https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html
- AWS Fargate task CPU/memory configurations: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html

## Issues Found
No technical issues found.

All Terraform resource attributes and AWS configuration choices verified as correct:
- `runtime = "provided.al2023"` is the current recommended runtime for Go on Lambda after the go1.x runtime deprecation (Dec 31, 2023).
- `handler = "bootstrap"` matches the convention required by the `provided.*` custom runtimes.
- The cross-compile command `GOOS=linux GOARCH=amd64 go build -o bootstrap main.go` is correct.
- `data.archive_file.go_app.output_base64sha256` is a valid attribute on the `archive_file` data source.
- API Gateway v2 (HTTP API) configuration: `protocol_type = "HTTP"`, `payload_format_version = "2.0"`, `integration_type = "AWS_PROXY"`, and `route_key = "ANY /{proxy+}"` are all correct.
- ECS Fargate task definition: `cpu = "256"` / `memory = "512"` is a valid Fargate combination; `healthCheck.startPeriod = 10` is within the allowed range (0–300 seconds).
- CloudWatch `AWS/Lambda` `Duration` metric is published in milliseconds, so `threshold = 5000` correctly represents 5 seconds.
- The claim that SnapStart is not available for custom runtimes is still accurate as of 2026 (SnapStart supports Java, Python 3.12+, and .NET 8 only).

## Review Notes
- The "fast cold starts (typically under 50ms)" claim refers to the user-controlled init portion. End-to-end Lambda cold starts (including platform INIT) for Go binaries on `provided.al2023` are commonly in the 80–200 ms range; sub-50 ms is achievable for very small handlers but is on the optimistic side. Not technically wrong, but worth noting.
- The container `healthCheck` uses `wget` — Go containers built `FROM scratch` or distroless images will not have `wget` available. If readers are using a minimal base image, they should either switch to `curl` (also missing in scratch/distroless), embed a Go-based health probe binary, or use a non-`scratch` base such as `alpine`/`distroless:base` with a shell. This is a common gotcha but not a code error.
- The `aws_ecs_task_definition` block omits `task_role_arn`. This is only required if the container itself calls AWS APIs at runtime (separate from the execution role used for image pulls / log writing). Not an error in this excerpt.
- Snippets reference `aws_iam_role.lambda`, `aws_iam_role.ecs_execution`, `aws_ecr_repository.go_app`, `aws_secretsmanager_secret.db_url`, `aws_secretsmanager_secret.api_key`, and `aws_sns_topic.alerts` without showing their definitions. This is normal for a focused tutorial; readers will need to add those resources to a full configuration.
- For ARM64 / Graviton Lambda (often cheaper), the build command would change to `GOARCH=arm64` and the function would need `architectures = ["arm64"]`. Not in scope for this post but worth knowing.
