# Validation Summary: How to Manage Ingress Resources with OpenTofu on Kubernetes

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Kubernetes
- Kubernetes provider for Terraform/OpenTofu
- Kubernetes Ingress
- Kubernetes Service
- Kubernetes Deployment
- Kubernetes Namespace

## Sources Consulted
- HashiCorp Kubernetes provider documentation: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/index.md
- HashiCorp Kubernetes provider `kubernetes_namespace_v1` resource: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/namespace_v1.md
- HashiCorp Kubernetes provider `kubernetes_deployment_v1` resource: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/deployment_v1.md
- HashiCorp Kubernetes provider `kubernetes_service_v1` resource: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/service_v1.md
- HashiCorp Kubernetes provider `kubernetes_ingress_v1` resource: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/ingress_v1.md
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
- The post was titled and described as an ingress guide, but the example only created a namespace and deployment. I replaced the example with a valid ingress-focused configuration that includes the supporting `kubernetes_service_v1` and `kubernetes_ingress_v1` resources, because an Ingress routes traffic to a Service rather than directly to a Deployment.
- The example used older unversioned resource names for namespace and deployment. I updated the snippet to the current `*_v1` resource forms documented by the official provider so the article matches the current provider resource documentation and the `networking.k8s.io/v1` Ingress API.
- The provider block explicitly set `config_context = var.kube_context` with a default value of `"default"`. I removed that because the provider already uses the default kubeconfig context when `config_context` is omitted, while hard-coding `"default"` assumes a context name that often does not exist.
- The original variable set did not include ingress-specific inputs. I replaced the unused `kube_context` variable with `ingress_class_name` and added `service_port` so the ingress backend and service definitions are complete and internally consistent.
- The conclusion emphasized deployment resource sizing rather than ingress correctness. I updated it to reflect actual ingress requirements from the official docs: the ingress should target an existing Service in the same namespace, each route needs a `path_type`, and `ingress_class_name` should be set when there is no default IngressClass.

## Review Notes
- Kubernetes documents Ingress as stable but frozen, and recommends the Gateway API for new feature development. The corrected post remains technically valid because Ingress is still supported and widely used.
