# Validation Summary: How to Implement Zero-Downtime Deployments with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS ECS (Fargate)
- AWS Application Load Balancer (ALB) target groups
- Kubernetes (kubernetes_deployment, PodDisruptionBudget)
- hashicorp/aws Terraform provider (~> 5.30)
- hashicorp/kubernetes Terraform provider

## Sources Consulted
- Terraform AWS provider `aws_lb_target_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group
- Terraform AWS provider `aws_ecs_service` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- Terraform AWS provider `aws_ecs_task_definition` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS ECS Task Definition container parameters: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html
- Terraform Kubernetes provider `kubernetes_deployment` docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Terraform Kubernetes provider `kubernetes_pod_disruption_budget_v1` docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/pod_disruption_budget_v1
- Kubernetes Deployment rolling update strategy: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-update-deployment
- Kubernetes Pod lifecycle hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/

## Issues Found
No technical issues found.

The configurations are syntactically and semantically correct:
- `aws_lb_target_group` with `target_type = "ip"` is required for Fargate — correct.
- `health_check` block arguments (`path`, `healthy_threshold`, `unhealthy_threshold`, `interval`, `timeout`, `matcher`) are valid.
- `deregistration_delay` is a valid top-level argument on `aws_lb_target_group`.
- ECS container definition fields `stopTimeout`, `healthCheck` (with `command`, `interval`, `timeout`, `retries`, `startPeriod`), and `portMappings` match AWS ECS task definition schema.
- `aws_ecs_service` arguments `deployment_maximum_percent`, `deployment_minimum_healthy_percent`, `health_check_grace_period_seconds`, and `deployment_circuit_breaker { enable, rollback }` are all valid.
- `kubernetes_deployment` strategy with `rolling_update { max_surge, max_unavailable }` and container `lifecycle { pre_stop { exec { command } } }` matches the provider schema.
- `kubernetes_pod_disruption_budget_v1` with `min_available` is the correct stable-v1 API resource.

## Review Notes
- The `~> 5.30` AWS provider constraint is reasonable; users on newer major versions (6.x) may need to adjust.
- The readiness probe uses `/ready` while the liveness probe uses `/health` — this is a good pattern but requires the application to actually implement separate endpoints; the post implies but does not explicitly call this out.
- The pre-stop `sleep 15` should be coordinated with `deregistration_delay` (60s) and `termination_grace_period_seconds` (60s) — the numbers in the post are sensible defaults but should be tuned to actual request duration in production.
- For ECS, `deployment_maximum_percent = 200` combined with `deployment_minimum_healthy_percent = 100` requires sufficient subnet IP space and Fargate capacity — worth noting but not an error.
