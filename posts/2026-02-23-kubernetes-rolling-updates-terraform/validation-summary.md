# Validation Summary: How to Handle Kubernetes Rolling Updates in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Kubernetes provider
- Kubernetes Deployments
- Kubernetes rolling update and recreate strategies
- Kubernetes ConfigMaps and Secrets
- Kubernetes readiness and liveness probes
- Kubernetes container lifecycle hooks
- kubectl rollout commands
- Blue-green deployment pattern

## Sources Consulted
- Kubernetes Deployment concepts: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes rolling update task documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes Pod lifecycle and termination flow: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes container lifecycle hooks: https://kubernetes.io/docs/concepts/containers/container-lifecycle-hooks/
- Kubernetes kubectl rollout status reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Terraform Registry documentation for `kubernetes_deployment`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- HashiCorp blog on Kubernetes provider wait conditions: https://www.hashicorp.com/en/blog/wait-conditions-in-the-kubernetes-provider-for-hashicorp-terraform
- Referenced OneUptime PodDisruptionBudget article: https://oneuptime.com/blog/post/2026-02-23-kubernetes-poddisruptionbudgets-terraform/view

## Issues Found
- The introduction said Terraform manages "readiness gates" for rolling updates, but the post's examples use readiness probes and do not configure Kubernetes readiness gates. Changed this to "readiness probes" to match the implementation and Kubernetes terminology.
- The `max_surge = "100%"` explanation said Kubernetes creates all new pods before terminating any old ones. Kubernetes allows up to that surge limit, but the controller may scale down old Pods as new Pods become available. Changed the wording to say it can create up to the full desired replica count in new Pods and may require 2x resources temporarily.
- The graceful shutdown sequence said a terminating Pod is removed from service endpoints. Current Kubernetes EndpointSlice behavior marks terminating endpoints as terminating and not ready rather than immediately removing them. Updated the sequence to describe terminating/not-ready EndpointSlice status and normal Service traffic behavior.

## Review Notes
The Terraform examples use the current HashiCorp Kubernetes provider `kubernetes_deployment` schema, including `strategy.rolling_update`, probe blocks, `wait_for_rollout`, and deployment `timeouts`. `wait_for_rollout` defaults to true in the provider, so setting it explicitly is valid but not required.
