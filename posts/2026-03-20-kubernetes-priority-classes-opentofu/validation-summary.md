# Validation Summary: How to Create Kubernetes Priority Classes with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- PriorityClass
- Kubernetes scheduling and preemption
- OpenTofu
- HashiCorp Kubernetes provider for OpenTofu/Terraform
- HCL

## Sources Consulted
- Kubernetes Pod Priority and Preemption: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes generated API reference for `PriorityClass`: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.32/#priorityclass-v1-scheduling-k8s-io
- HashiCorp Kubernetes provider `kubernetes_priority_class_v1` documentation: https://github.com/hashicorp/terraform-provider-kubernetes/blob/v3.0.1/docs/resources/priority_class_v1.md
- HashiCorp Kubernetes provider `kubernetes_deployment_v1` documentation: https://github.com/hashicorp/terraform-provider-kubernetes/blob/v3.0.1/docs/resources/deployment_v1.md
- HashiCorp Kubernetes provider `kubernetes_cron_job_v1` documentation: https://github.com/hashicorp/terraform-provider-kubernetes/blob/v3.0.1/docs/resources/cron_job_v1.md

## Issues Found
- The example created a custom PriorityClass named `system-critical`. Kubernetes reserves the `system-` prefix for built-in PriorityClasses, so I renamed it to `platform-critical`.
- The post said `preemption_policy = "Never"` prevents pods from being preempted. That is incorrect. I updated the description, inline comment, and summary to reflect the actual behavior: it prevents pods in that class from preempting lower-priority pods, and it does not guarantee immunity from higher-priority preemption or node-pressure eviction.
- The summary said PriorityClasses ensure critical services get resources during capacity constraints. I revised that wording to say they provide scheduling preference, which is the accurate guarantee.

## Review Notes
- The HCL resource names and field names used in the examples match the current `kubernetes_priority_class_v1`, `kubernetes_deployment_v1`, and `kubernetes_cron_job_v1` provider documentation.
- The examples use `:latest` container image tags. That is valid, but pinning explicit image versions would make infrastructure changes more reproducible.
