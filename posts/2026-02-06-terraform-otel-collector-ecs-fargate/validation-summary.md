# Validation Summary: How to Use Terraform to Deploy and Configure the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol (OTLP)
- Terraform
- AWS ECS
- AWS Fargate
- AWS IAM
- AWS Secrets Manager
- AWS CloudWatch Logs

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry OTLP exporter configuration documentation: https://opentelemetry.io/docs/concepts/sdk-configuration/otlp-exporter-configuration/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector official releases repository: https://github.com/open-telemetry/opentelemetry-collector-releases
- Amazon ECS Fargate task networking documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-networking.html
- Amazon ECS task definition parameters documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Amazon ECS task execution IAM role documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Terraform AWS provider `aws_ecs_task_definition` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition

## Issues Found
- The Collector receiver endpoints were bound to `0.0.0.0`. Since the post describes same-task local communication, changed them to `localhost` to match ECS Fargate localhost communication and OpenTelemetry's current security guidance.
- The Collector exporter header used the older `${OTLP_API_KEY}` environment expansion form. Changed it to `${env:OTLP_API_KEY}` escaped for Terraform as `$${env:OTLP_API_KEY}`.
- The application container set `OTEL_EXPORTER_OTLP_ENDPOINT` to port `4317` without explicitly selecting OTLP/gRPC. Added `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` so the SDK configuration matches the gRPC endpoint.
- The Collector image tag `otel/opentelemetry-collector-contrib:0.96.0` was outdated. Updated it to `0.153.0`, the latest official release available during validation.
- The ECS task definition referenced `aws_iam_role.ecs_task` but the supporting resources did not define it. Added the missing ECS task IAM role.
- The task definition referenced `var.ecr_repo_url` and `var.app_port`, but those variables were not declared. Added both variable declarations.
- The ECS secret reference created only the Secrets Manager secret container, not a secret value. Added an `aws_secretsmanager_secret_version` resource and a sensitive `otlp_api_key` variable.
- The deploy commands did not provide all required variables and used `terraform apply` without preserving the reviewed plan. Updated them to include the required variables, write a plan file, and apply that plan file.

## Review Notes
Terraform is not installed in the local environment, so `terraform validate` could not be run. The corrected snippets were reviewed statically against the official OpenTelemetry, AWS ECS, and Terraform AWS provider documentation.
