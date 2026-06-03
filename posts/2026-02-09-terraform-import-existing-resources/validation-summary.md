# Validation Summary: How to Implement Terraform Import for Existing Kubernetes Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform import
- Terraform lifecycle meta-arguments
- HashiCorp Kubernetes provider
- Kubernetes Deployments, Services, ConfigMaps, Secrets, StatefulSets, PersistentVolumeClaims, Ingress, and RBAC resources
- kubectl

## Sources Consulted
- Terraform import overview: https://developer.hashicorp.com/terraform/cli/import
- Terraform import command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform lifecycle meta-arguments: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform Kubernetes provider namespace resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/namespace
- Terraform Kubernetes provider service resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service
- Terraform Kubernetes provider secret_v1 resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret_v1
- Terraform Kubernetes provider deployment resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Terraform Kubernetes provider stateful_set resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/stateful_set
- Terraform Kubernetes provider persistent_volume_claim resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/persistent_volume_claim
- Terraform Kubernetes provider ingress_v1 resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/ingress_v1
- Terraform Kubernetes provider role_binding resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/role_binding
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The Secret example used base64-looking strings in `kubernetes_secret.data`. The Terraform Kubernetes provider accepts decoded string values for `data`; base64-encoded binary payloads belong in `binary_data`. Updated the text and example values to avoid double-encoding or state drift when converting from `kubectl get secret -o yaml`.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Updated it to use `spec.ingress_class_name = "nginx"`, which is the current Kubernetes and Terraform provider field for newly created Ingress resources.
- The `ignore_changes` example included read-only metadata fields such as `uid`, `resource_version`, and `generation`. Terraform does not manage those values as configurable arguments. Updated the section to focus on controller-managed configurable fields such as annotations.

## Review Notes
- The post uses non-`_v1` Kubernetes provider resources for several core resources. These are still documented in the current provider, while `_v1` aliases are also available for many resources.
- Terraform and kubectl were not installed in the local workspace, so command checks were performed against official documentation rather than local `--help` output.
