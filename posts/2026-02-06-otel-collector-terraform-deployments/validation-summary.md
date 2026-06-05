# Validation Summary: How to Define OpenTelemetry Collector Deployments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- Terraform
- HashiCorp Kubernetes provider
- HashiCorp AWS provider
- Kubernetes DaemonSet and ConfigMap
- AWS ECS Fargate task definitions and services

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- HashiCorp Terraform Kubernetes provider `kubernetes_daemon_set_v1` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/daemon_set_v1
- HashiCorp Terraform Kubernetes provider `kubernetes_config_map` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/config_map
- HashiCorp Terraform Kubernetes provider `kubernetes_namespace` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/namespace
- HashiCorp Terraform AWS provider `aws_ecs_task_definition` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- HashiCorp Terraform AWS provider `aws_ecs_service` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- HashiCorp Terraform CLI plan documentation: https://developer.hashicorp.com/terraform/cli/commands/plan

## Issues Found
- The Kubernetes module described `collector_mode` as supporting both `daemonset` and `deployment`, but the snippet only defines a DaemonSet. Updated the variable description to list only `daemonset` so the documented behavior matches the implementation.
- The Kubernetes ConfigMap and DaemonSet used `var.namespace` directly even though the module creates the namespace. Updated those namespace fields to reference `kubernetes_namespace.observability.metadata[0].name`, which gives Terraform an explicit dependency on the namespace resource.
- The ECS task definition set `OTEL_CONFIG` but used `command = ["--config", "/etc/otel/config.yaml"]`, which points the Collector to a file that the ECS task does not create or mount. Updated the command to `["--config", "env:OTEL_CONFIG"]`, which matches the OpenTelemetry Collector configuration provider syntax for reading configuration from an environment variable.
- The ECS example passed `var.collector_config_base64` to `OTEL_CONFIG`. The Collector `env:` configuration provider expects configuration content from the environment variable, not a base64-encoded value. Updated the example to use `var.collector_config`.
- The ECS service referenced `aws_service_discovery_service.collector.arn`, but the post did not define that resource. Removed the `service_registries` block so the snippet no longer contains an undefined Terraform resource reference.

## Review Notes
- The post pins OpenTelemetry Collector image tag `0.96.0`, which is old as of 2026-06-05, but the examples remain version-valid for the features shown. Future updates could refresh the image tag and include complete variable definitions for the ECS module.
