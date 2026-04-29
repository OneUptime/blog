# Validation Summary: How to Manage Persistent Volumes with OpenTofu on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Kubernetes
- HCL
- HashiCorp Kubernetes provider
- PersistentVolumeClaims
- Kubernetes Deployments

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu configuration syntax: https://opentofu.org/docs/language/syntax/configuration/
- HCL native syntax specification: https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- HashiCorp Kubernetes provider overview: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/index.md
- HashiCorp Kubernetes provider `kubernetes_namespace_v1`: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/namespace_v1.md
- HashiCorp Kubernetes provider `kubernetes_persistent_volume_claim_v1`: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/persistent_volume_claim_v1.md
- HashiCorp Kubernetes provider `kubernetes_deployment_v1`: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/deployment_v1.md
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- The post was titled and described as a persistent volume guide, but the original example only created a namespace and a generic deployment. I replaced the example with a `kubernetes_persistent_volume_claim_v1` resource and a `kubernetes_deployment_v1` that mounts the claim so the code matches the topic.
- The original resource examples used older untyped resource names. I updated them to the current typed resources documented by the Kubernetes provider.
- The provider setup omitted a `required_providers` declaration. I added it to align the example with OpenTofu's provider requirements documentation.
- The Variables section used one-line declarations with semicolon separators, which do not match the HCL native syntax used by OpenTofu configuration files. I rewrote the variables as standard multiline blocks.
- The conclusion focused on CPU and memory guidance instead of persistent storage behavior. I updated it to reflect PVC usage, StorageClasses, and the requirement that a claim be in the same namespace as the pods that use it.

## Review Notes
- The revised example manages persistent storage through a PersistentVolumeClaim, which is the standard application-facing pattern in Kubernetes. The backing PersistentVolume may be dynamically provisioned depending on the cluster's StorageClass configuration.
- `storage_class_name` values are cluster-specific, so the example keeps that value as an input variable rather than hard-coding a class name that may not exist on another cluster.
- If the cluster has no matching or default StorageClass, the claim will remain in `Pending` until a suitable PersistentVolume is available.
