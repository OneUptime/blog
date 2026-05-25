# Validation Summary: How to Create Container Health Check Configurations in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Kubernetes Deployments and container probes
- AWS ECS task definitions and services
- AWS Application Load Balancer target groups
- OneUptime synthetic monitoring

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- HashiCorp Kubernetes provider documentation for `kubernetes_deployment`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- HashiCorp Kubernetes provider documentation for `kubernetes_deployment_v1`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment_v1
- Amazon ECS Developer Guide: Determine Amazon ECS task health using container health checks: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html
- Amazon ECS API Reference: HealthCheck: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_HealthCheck.html
- HashiCorp AWS provider documentation for `aws_ecs_task_definition`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- HashiCorp AWS provider documentation for `aws_lb_target_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group

## Issues Found
- The introduction claimed the guide covered Azure Container Apps and Docker Compose, but the post only includes Kubernetes and AWS ECS examples. Changed the scope sentence to mention only Kubernetes and AWS ECS.
- The gRPC probe comment said "Kubernetes 1.24+". gRPC probes were available as beta in Kubernetes 1.24, but the current Kubernetes documentation marks them stable in Kubernetes 1.27. Updated the comment to "stable in Kubernetes 1.27+".

## Review Notes
- The Kubernetes probe examples use valid Terraform Kubernetes provider block names for HTTP, TCP, exec, startup, liveness, readiness, and gRPC probes.
- The ECS task definition health check uses the documented `CMD-SHELL`, `interval`, `timeout`, `retries`, and `startPeriod` fields. The values are within AWS ECS documented ranges.
- The ALB target group health check fields and values are valid for an HTTP target group.
- The ECS health check command depends on `curl` being present in the container image, which is consistent with AWS ECS documentation that health check commands run inside the container.
