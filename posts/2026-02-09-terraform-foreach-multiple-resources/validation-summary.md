# Validation Summary: How to Use Terraform for_each to Create Multiple Kubernetes Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform `for_each` meta-argument
- Terraform dynamic blocks and local values
- Terraform Kubernetes provider
- Terraform Random provider
- Kubernetes Namespaces
- Kubernetes ResourceQuotas
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes ConfigMaps
- Kubernetes Ingress
- Kubernetes Secrets

## Sources Consulted
- Terraform `for_each` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/for_each
- Terraform Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Terraform Kubernetes provider `kubernetes_deployment` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Terraform Kubernetes provider `kubernetes_service` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service
- Terraform Kubernetes provider `kubernetes_config_map` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/config_map
- Terraform Kubernetes provider `kubernetes_resource_quota` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/resource_quota
- Terraform Kubernetes provider `kubernetes_ingress_v1` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/ingress_v1
- Terraform Kubernetes provider `kubernetes_secret` resource documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Terraform Random provider `random_password` resource documentation: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/password
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/

## Issues Found
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Removed that annotation and added `ingress_class_name = "nginx"` in the `kubernetes_ingress_v1` `spec`, matching current Kubernetes Ingress guidance.
- The final `kubernetes_deployment` example was too incomplete to work as a Terraform Kubernetes provider deployment because it omitted the required selector, pod template labels, and container image. Added a matching `selector.match_labels`, pod template metadata labels, namespace, replica count, and an example image while preserving the secret reference being demonstrated.

## Review Notes
- The examples assume the Kubernetes provider, Random provider, target cluster credentials, `production` namespace, ingress controller, cert-manager issuer, and referenced container images/services already exist where applicable.
- The `kubernetes_secret` example is technically valid, but the Random provider documentation notes that generated passwords are stored in Terraform state unless a write-only or ephemeral integration is used where supported.
