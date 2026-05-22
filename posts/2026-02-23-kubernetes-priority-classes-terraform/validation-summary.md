# Validation Summary: How to Create Kubernetes Priority Classes with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PriorityClass and pod priority/preemption
- Terraform Kubernetes provider
- Terraform Helm provider
- kubectl
- Helm chart value overrides for ingress-nginx and kube-prometheus-stack

## Sources Consulted
- Kubernetes documentation: Pod Priority and Preemption - https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/
- Kubernetes documentation: Guaranteed Scheduling For Critical Add-On Pods - https://kubernetes.io/docs/tasks/administer-cluster/guaranteed-scheduling-critical-addon-pods/
- Kubernetes documentation: Field Selectors - https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kubectl reference: create priorityclass - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_priorityclass/
- Terraform Registry: kubernetes_priority_class resource - https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/priority_class
- ingress-nginx Helm chart values - https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/values.yaml
- kube-prometheus-stack Helm chart values/templates - https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack

## Issues Found
- The custom PriorityClass was named `system-critical`. Kubernetes reserves the `system-` prefix for built-in system PriorityClasses and user-created PriorityClass names cannot use that prefix. Renamed the custom class to `platform-critical` and updated all Terraform references and related wording.

## Review Notes
- Kubernetes allows custom PriorityClass values up to 1,000,000,000 inclusive; larger values are reserved for built-in critical system PriorityClasses.
- `preemption_policy = "Never"` is technically correct for non-preempting PriorityClasses: those pods can be ordered ahead of lower-priority pending pods but cannot preempt running pods.
- `kubectl get events --field-selector reason=Preempted -A` and `kubectl get pods --field-selector status.phase=Pending -A` use supported field selectors.
