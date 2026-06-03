# Validation Summary: How to Implement Terraform Lifecycle Rules for Kubernetes Resource Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform lifecycle meta-arguments
- HashiCorp Kubernetes Terraform provider
- Kubernetes Deployments, Services, StatefulSets, PersistentVolumeClaims, ConfigMaps, Secrets, Pods, Namespaces
- Kubernetes HorizontalPodAutoscaler autoscaling/v2
- HCL configuration

## Sources Consulted
- Terraform lifecycle meta-argument reference: https://docs.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform resource block reference: https://developer.hashicorp.com/terraform/language/block/resource
- HashiCorp Kubernetes provider `kubernetes_deployment` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- HashiCorp Kubernetes provider `kubernetes_secret` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- HashiCorp Kubernetes provider `kubernetes_horizontal_pod_autoscaler_v2` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/horizontal_pod_autoscaler_v2
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes rolling update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes HorizontalPodAutoscaler API documentation: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/

## Issues Found
- The `create_before_destroy` Deployment and Service example used fixed Kubernetes object names, which would conflict with Kubernetes name uniqueness during replacement. Changed the section to explain that `create_before_destroy` only works when old and new objects can coexist, updated the Deployment to use `generate_name`, and removed `create_before_destroy` from the fixed-name Service.
- The post claimed Terraform creates new pods, waits for readiness, and then terminates old pods because of `create_before_destroy`. Adjusted this to state that Terraform creates the replacement resource first and that the Kubernetes provider waits for Deployment rollout by default.
- The Secret example pre-base64-encoded values in `data`. The Kubernetes provider's `data` argument accepts plain string values, while `binary_data` is for base64-encoded binary data. Removed `base64encode`.
- The ConfigMap/Secret update example used `replace_triggered_by` to force Deployment recreation. Replaced that with the safer Kubernetes pod-template annotation hash pattern, which triggers a normal Deployment rollout.
- The combined StatefulSet lifecycle example used both `prevent_destroy` and `create_before_destroy`, which is misleading for a fixed-name StatefulSet and would still require destroying the existing object during replacement. Removed `create_before_destroy` from that example and adjusted the explanation.
- The conditional lifecycle example set `prevent_destroy` from a variable expression, but Terraform lifecycle settings must use literal values. Reworked the example to split production and non-production namespace resources using `count`.
- The operational notes incorrectly said removing `prevent_destroy` requires two applies and that adding `create_before_destroy` may immediately recreate a resource. Updated the notes to match Terraform lifecycle behavior.

## Review Notes
The HPA example is syntactically valid, and `ignore_changes` on `spec[0].replicas` is a common Terraform pattern. Kubernetes documentation recommends not setting `.spec.replicas` when an HPA manages a Deployment; future revisions could mention that caveat explicitly.
