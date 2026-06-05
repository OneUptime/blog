# Validation Summary: How to Configure OpenTelemetry for AWS ECS with Sidecar Collector

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS ECS
- AWS Fargate
- AWS Distro for OpenTelemetry Collector
- OpenTelemetry Collector configuration
- AWS Systems Manager Parameter Store
- IAM task roles and task execution roles
- AWS X-Ray
- Amazon CloudWatch Metrics and CloudWatch Logs
- Go OpenTelemetry SDK
- AWS CLI

## Sources Consulted
- AWS Distro for OpenTelemetry: custom Collector config from SSM Parameter Store: https://aws-otel.github.io/docs/setup/ecs/config-through-ssm/
- AWS Observability Best Practices: ADOT Collector deployment patterns on ECS: https://aws-observability.github.io/observability-best-practices/guides/containers/oss/ecs/best-practices-metrics-collection-1/
- Amazon ECS Developer Guide: ADOT sidecar task definition for X-Ray integration: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/trace-data-containerdefinitions.html
- Amazon ECS Developer Guide: task networking with awsvpc and localhost communication: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-networking-awsvpc.html
- Amazon ECS Developer Guide: task execution role and SSM Parameter Store permissions: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Amazon ECS Developer Guide: SSM parameters in container environment variables: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-ssm-paramstore.html
- Amazon ECS task definition parameters and container dependency conditions: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters_ec2.html
- Amazon ECS container health checks: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- AWS Distro for OpenTelemetry permissions guidance: https://aws-otel.github.io/docs/setup/permissions/
- AWS Distro for OpenTelemetry v0.39.0 release notes: https://aws-otel.github.io/docs/ReleaseBlogs/aws-distro-for-opentelemetry-collector-v0.39.0/
- AWS Distro for OpenTelemetry Collector supported components: https://github.com/aws-observability/aws-otel-collector
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporter list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Go exporter documentation: https://opentelemetry.io/docs/languages/go/exporters/
- Go package documentation for OpenTelemetry metric SDK: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/metric
- Go package documentation for OpenTelemetry semantic conventions v1.24.0: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.24.0
- AWS CLI command references for ECS, SSM, IAM, and CloudWatch Logs commands: https://docs.aws.amazon.com/cli/latest/reference/

## Issues Found
- The Collector configuration defined an `awscloudwatchlogs` exporter but did not include a `logs` pipeline, so OTLP logs would not be exported to CloudWatch Logs. Added a logs pipeline using the OTLP receiver, existing processors, and the CloudWatch Logs exporter.
- The ECS task definition injected the Collector config as `COLLECTOR_CONFIG` and passed it with `--config env:COLLECTOR_CONFIG`. Official ADOT ECS documentation uses the `AOT_CONFIG_CONTENT` environment variable for SSM-injected full Collector configuration. Updated the task definition to use `AOT_CONFIG_CONTENT`.
- The IAM policy placed SSM read access on the task role. ECS resolves `secrets` values from Parameter Store through the task execution role, and AWS documents `ssm:GetParameters` as the required action for that role. Moved the SSM permission into a separate execution-role policy example and adjusted the IAM commands.
- The health check endpoint was referenced in the task definition before being enabled in the main Collector configuration. Added the `health_check` extension to the main config and enabled it under `service.extensions`.
- The task dependency used `START` while the explanatory text claimed it prevented telemetry from being sent before the Collector was ready. `START` only waits for container start; `HEALTHY` waits for the configured health check. Updated the dependency to `HEALTHY` and aligned the explanation.
- The ECS health check used `/health`, but the OpenTelemetry Collector health check extension defaults to `/`. Updated the health check command to query `http://localhost:13133/`.
- The CloudWatch Logs IAM permissions omitted `logs:DescribeLogGroups`, which ADOT's published permissions include for CloudWatch log publishing. Added it to the task role policy.

## Review Notes
- The Go OpenTelemetry example uses current package paths and non-deprecated APIs for traces and metrics. The local environment did not have Go installed, so syntax was reviewed against official package documentation rather than compiled locally.
- The health check command assumes the Collector image has `wget` available. ECS health checks run inside the container, so a production setup should verify the selected ADOT image contains the command or use a derived image with an HTTP client.
