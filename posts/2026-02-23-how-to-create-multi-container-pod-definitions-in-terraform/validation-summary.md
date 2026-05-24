# Validation Summary: How to Create Multi-Container Pod Definitions in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Terraform Kubernetes provider (`kubernetes_deployment`, `kubernetes_config_map`)
- Terraform AWS provider (`aws_ecs_task_definition`, `aws_efs_file_system`, `aws_secretsmanager_secret`, `aws_cloudwatch_log_group`, `aws_iam_role`)
- Kubernetes (pods, init containers, sidecars, volumes, probes)
- AWS ECS (Fargate task definitions, container dependencies, EFS volumes)
- Envoy proxy (service mesh sidecar)
- Fluent Bit (log forwarder sidecar)
- Datadog Agent (APM sidecar)
- Nginx (reverse proxy sidecar)
- Prometheus statsd_exporter

## Sources Consulted
- Terraform Kubernetes provider docs — `kubernetes_deployment`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Terraform Kubernetes provider docs — `kubernetes_config_map`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/config_map
- Terraform AWS provider docs — `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- Kubernetes init containers: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes emptyDir volumes: https://kubernetes.io/docs/concepts/storage/volumes/#emptydir
- AWS ECS task definition parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- AWS Fargate task CPU/memory configurations: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-task-defs.html
- Envoy admin interface and listener port conventions: https://www.envoyproxy.io/docs/envoy/latest/operations/admin
- Fluent Bit configuration reference: https://docs.fluentbit.io/manual/administration/configuring-fluent-bit
- Prometheus statsd_exporter (default metrics port 9102): https://github.com/prometheus/statsd_exporter

## Issues Found
1. **Envoy sidecar `UPSTREAM_URL` pointed to the admin port.** In the Service Mesh Sidecar Pattern, the main application's `UPSTREAM_URL` env var was set to `http://localhost:9901`. Port 9901 is the Envoy admin interface (used for management/stats), not for routing application traffic. Application traffic must go to a real listener. The example defines an `ingress` listener on port 10000, so I changed the value to `http://localhost:10000` so the sidecar pattern actually works end-to-end.

## Review Notes
- The `envoyproxy/envoy:v1.28-latest` rolling tag works but is non-deterministic; users running this in production should pin to an immutable digest or specific patch tag.
- `public.ecr.aws/datadog/agent:latest` and `latest` floating tags appear in a few examples. They are valid for a tutorial but worth pinning in real deployments.
- The Fargate task-level totals (1024 CPU / 2048 MiB) exactly match the sum of container-level allocations (512+256+256 / 1024+512+512). Container-level CPU/memory are optional on Fargate; exactly matching the totals is fine but not required.
- The Kubernetes provider's `resources` block accepts `requests` and `limits` either as nested blocks or as map assignments — the assignment syntax used here is supported.
- The `init_container`, `container`, `volume_mount`, `volume`, `liveness_probe`, `readiness_probe`, and `http_get` block names match the current Terraform Kubernetes provider schema.
- The `dependsOn` with `condition = "HEALTHY"` on the nginx container is valid because the `app` container defines a `healthCheck`. Without that, ECS would reject the task definition.
- The `efs_volume_configuration` block on `aws_ecs_task_definition` is correct; users will need an EFS access point and proper IAM/security-group setup outside this snippet for it to actually mount.
- The `kubernetes_config_map.envoy` resource is referenced but not defined in the Service Mesh Sidecar snippet — acceptable for an illustrative example.
