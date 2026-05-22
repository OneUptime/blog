# Validation Summary: How to Configure Kubernetes Liveness and Readiness Probes in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp Kubernetes provider
- Kubernetes Deployments
- Kubernetes liveness, readiness, and startup probes
- HTTP, TCP socket, exec, and gRPC probe mechanisms

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- HashiCorp Terraform Kubernetes provider deployment resource documentation - https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- HashiCorp Terraform Kubernetes provider source documentation for deployment resource - https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/deployment.md

## Issues Found
- The gRPC probe section said gRPC probes require Kubernetes 1.27+. Kubernetes documentation marks gRPC probes as stable in Kubernetes 1.27, but they existed before that as a feature-gated/beta capability. Changed the wording to "stable in Kubernetes 1.27+".
- The best-practices section said to always configure both liveness and readiness probes for production workloads. Kubernetes documentation notes that liveness probes are not always necessary if the process exits on its own when unhealthy and cautions against unnecessary liveness checks. Reworded the guidance to recommend readiness probes for production traffic management and liveness probes when Kubernetes should restart containers that cannot recover on their own.

## Review Notes
The Terraform probe block names and nested fields used in the examples match the HashiCorp Kubernetes provider documentation, including `liveness_probe`, `readiness_probe`, `startup_probe`, `http_get`, `http_header`, `tcp_socket`, `exec`, and `grpc`. The Kubernetes probe behavior descriptions align with the current Kubernetes documentation.
