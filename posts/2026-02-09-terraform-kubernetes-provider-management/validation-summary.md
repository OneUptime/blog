# Validation Summary: How to Configure Terraform Kubernetes Provider for Cluster Resource Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Kubernetes provider
- Kubernetes Deployments, Services, Ingress, ConfigMaps, Secrets, PVCs, StatefulSets, ResourceQuotas, LimitRanges, and NetworkPolicies
- AWS EKS exec authentication

## Sources Consulted
- HashiCorp Terraform Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- HashiCorp Terraform Kubernetes provider `kubernetes_secret` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- HashiCorp Terraform Kubernetes provider `kubernetes_service` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service
- HashiCorp Terraform Kubernetes provider `kubernetes_network_policy` resource: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/network_policy
- HashiCorp Terraform provider configuration documentation: https://developer.hashicorp.com/terraform/language/providers/configuration
- HashiCorp Terraform built-in filesystem functions documentation: https://developer.hashicorp.com/terraform/language/functions
- HashiCorp Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- Kubernetes Ingress documentation and API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/ and https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- AWS CLI `eks get-token` documentation: https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html

## Issues Found
- The provider setup snippet showed three unaliased `provider "kubernetes"` blocks in one HCL block. Terraform uses one default provider configuration unless additional configurations are aliased, so the alternatives were split into separate HCL examples.
- The explicit credential example used `file("~/.kube/...")`. Terraform's `file` function does not perform shell expansion, so the paths now use `file(pathexpand("~/.kube/..."))`.
- The Secret examples base64-encoded values in the `data` argument. The Kubernetes provider's `data` argument expects plain secret data and handles encoding for the Kubernetes API, so the examples now pass plain strings and use `file()` for TLS certificate files.
- The Secret explanation said Kubernetes automatically base64-encodes Secrets in a way that could imply users should encode Terraform inputs. It now clarifies that Terraform handles encoding for the `data` attribute.
- The Ingress example created the Ingress in the production namespace while pointing at a Service in the development namespace. Kubernetes Ingress service backends must exist in the same namespace as the Ingress, so the Ingress and TLS Secret examples now use the development namespace consistently.
- The Ingress example used the legacy `kubernetes.io/ingress.class` annotation. It now uses the `ingress_class_name` field in the `kubernetes_ingress_v1` spec.
- The NetworkPolicy example selected `kube-system` with a `name = "kube-system"` namespace label, which Kubernetes does not set by default. It now uses the stable automatic namespace label `kubernetes.io/metadata.name`.
- The best-practices section suggested storing sensitive data in Terraform variables. It now clarifies that secrets passed through Terraform can still be stored in state and that state must be protected.

## Review Notes
Terraform CLI was not installed in the workspace, so I could not run `terraform fmt` or `terraform validate`. The review was performed statically against official Terraform, HashiCorp provider, Kubernetes, and AWS CLI documentation. The provider constraint `~> 2.24` is older than the current latest provider version checked during review, but the referenced resource types remain documented and usable.
