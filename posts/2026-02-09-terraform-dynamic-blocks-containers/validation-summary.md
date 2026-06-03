# Validation Summary: How to Configure Terraform Dynamic Blocks for Kubernetes Container Definitions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform dynamic blocks
- Terraform HCL variables, locals, conditional expressions, and `concat`
- HashiCorp Terraform Kubernetes provider
- Kubernetes Deployments, containers, init containers, environment variables, volume mounts, resource requests and limits, and liveness probes

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- HashiCorp Kubernetes provider `kubernetes_deployment` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/resources/deployment.md
- Kubernetes probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes resource requests and limits documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes init containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/

## Issues Found
- The basic container example used `busybox:latest` as a sidecar without a command. The default BusyBox command exits quickly, so the Deployment would not keep that container running as a useful example. Changed it to `redis:7-alpine` with port `6379`.
- The conditional container example concatenated `var.advanced_containers` with `var.monitoring_container`, but `monitoring_container` only had `name`, `image`, and `port`. Because the later container block expects fields such as CPU/memory settings, environment variables, volume mounts, and liveness probe settings, the combined list needed a consistent object shape. Expanded `monitoring_container` to match the advanced container schema and added sensible default values.

## Review Notes
Terraform was not installed in the workspace, so I could not run `terraform validate`. The snippets were reviewed against official Terraform language documentation, the current HashiCorp Kubernetes provider deployment schema, and Kubernetes documentation for probes, resources, and init containers.
