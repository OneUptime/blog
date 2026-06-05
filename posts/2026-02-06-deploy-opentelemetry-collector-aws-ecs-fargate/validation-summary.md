# Validation Summary: How to Deploy the OpenTelemetry Collector on AWS ECS Fargate

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- AWS ECS
- AWS Fargate
- AWS Distro for OpenTelemetry Collector
- OpenTelemetry Collector configuration
- AWS X-Ray
- Amazon CloudWatch and CloudWatch Logs
- AWS Systems Manager Parameter Store
- AWS Secrets Manager
- Elastic Load Balancing Application Load Balancer
- AWS Cloud Map service discovery
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- AWS Distro for OpenTelemetry: ECS SSM configuration with `AOT_CONFIG_CONTENT`: https://aws-otel.github.io/docs/setup/ecs/config-through-ssm/
- AWS Distro for OpenTelemetry: included collector components: https://aws-otel.github.io/docs/releases/
- AWS Distro for OpenTelemetry: ECS container metrics receiver and `awsemf` exporter examples: https://aws-otel.github.io/docs/components/ecs-metrics-receiver/
- AWS Distro for OpenTelemetry: ECS configuration examples for CloudWatch, AMP, and X-Ray: https://aws-otel.github.io/docs/getting-started/ecs-configurations/ecs-config-section/
- Amazon ECS API Reference: `PortMapping`: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_PortMapping.html
- Amazon ECS API Reference: `Volume`: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_Volume.html
- AWS CLI Command Reference: `elbv2 create-target-group`: https://docs.aws.amazon.com/cli/latest/reference/elbv2/create-target-group.html
- Elastic Load Balancing documentation: Application Load Balancer target groups and gRPC constraints: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html
- AWS CLI Command Reference: `ecs update-service` service registry support: https://docs.aws.amazon.com/cli/latest/reference/ecs/update-service.html
- OpenTelemetry Collector documentation: internal telemetry configuration and metric names: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- JSON snippets contained `#` filename comments, which made them invalid JSON. Removed those comments from the JSON code blocks.
- The ECS task definitions mounted an empty Fargate volume at `/etc/ecs` and pointed the collector at config files that would not exist. Replaced the mount-based approach with ADOT's supported `AOT_CONFIG_CONTENT` secret sourced from SSM Parameter Store.
- The execution role lacked permissions to inject SSM parameters and Secrets Manager secrets. Added an inline execution-role policy example for `ssm:GetParameters`, `secretsmanager:GetSecretValue`, and `kms:Decrypt`.
- The collector policy only covered `/ecs/otel-collector`, while the examples export logs and EMF data to `/aws/ecs/...` log groups. Expanded the log permissions and separated `logs:CreateLogGroup` with `Resource: "*"`.
- The metrics exporter was named `awscloudwatch`, which is not the ADOT CloudWatch metrics exporter. Replaced it with the supported `awsemf` exporter.
- The examples used the deprecated `logging` exporter. Replaced it with the `debug` exporter and updated pipeline references.
- Environment variable expansion used legacy `${VAR}` syntax in collector config examples. Updated examples to `${env:VAR}`.
- The CloudWatch dashboard referenced collector internal metrics without a pipeline to send those metrics to CloudWatch. Added a Prometheus receiver that scrapes collector telemetry and exports it through `awsemf`, and updated collector telemetry configuration to use readers instead of the deprecated `metrics.address` field.
- The ALB target groups omitted `--target-type ip`, which is required for ECS Fargate tasks using `awsvpc` networking. Added `--target-type ip` to both target group commands.
- The gRPC ALB listener used HTTP, but ALB gRPC requires an HTTPS listener. Updated the gRPC listener example to use HTTPS with an ACM certificate and changed the sidecar gateway endpoint to a certificate-matching DNS name.
- The ECS service only attached the gRPC target group, leaving the OTLP/HTTP target group without registered tasks. Updated the `create-service` command to attach both target groups.
- The ALB health check for the gRPC target group was pointed at the gRPC traffic port. Updated it to use the collector health check extension on port `13133` and added the required task security group ingress.
- The sidecar task definition referenced a Parameter Store config without showing how to store it. Added the matching `aws ssm put-parameter` command.
- CloudWatch ECS alarm examples lacked `ClusterName` and `ServiceName` dimensions. Added the required dimensions and updated the dashboard metric widget accordingly.
- The Terraform task definition used a nonexistent config file path. Removed that command and added an `AOT_CONFIG_CONTENT` secret reference.

## Review Notes
The guide is now technically valid as an example deployment, but several snippets still use placeholder ARNs, subnet IDs, certificate IDs, DNS names, and Terraform resources/variables that readers must provide. The AWS CLI was not installed in the local environment, so command verification was performed against official AWS CLI and AWS service documentation rather than local `--help` output.
