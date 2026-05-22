# Validation Summary: How to Handle Kubernetes Resource Updates in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Terraform Kubernetes provider
- Kubernetes Deployments
- Kubernetes Services
- Kubernetes HorizontalPodAutoscaler
- Kubernetes ConfigMaps and Secrets
- Terraform lifecycle meta-arguments
- Terraform import

## Sources Consulted
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform import language reference: https://developer.hashicorp.com/terraform/language/import
- HashiCorp Kubernetes provider `kubernetes_deployment` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- HashiCorp Kubernetes provider `kubernetes_service` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service
- HashiCorp Kubernetes provider `kubernetes_horizontal_pod_autoscaler_v2` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/horizontal_pod_autoscaler_v2
- HashiCorp Kubernetes provider `kubernetes_namespace` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/namespace
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- HashiCorp Kubernetes provider wait conditions article: https://www.hashicorp.com/en/blog/wait-conditions-in-the-kubernetes-provider-for-hashicorp-terraform

## Issues Found
- The post said in-place Deployment updates have "No downtime." I changed this to clarify that Terraform will not recreate the Deployment, but availability depends on the Kubernetes rollout strategy, readiness checks, and pod health.
- The post recommended `create_before_destroy` broadly for replacement downtime. I clarified that this only works when the replacement can be created with a non-conflicting name, because fixed-name Kubernetes objects in the same namespace cannot exist twice.
- The HPA section implied setting `replicas` and using `ignore_changes` as the general pattern. I added the Kubernetes documentation caveat that `.spec.replicas` should not be set when an HPA manages a Deployment, while preserving the Terraform-specific guidance for cases where an initial value is kept.
- The ConfigMap and Secret section said updates do not automatically restart pods. I kept that claim but added the important nuance that volume-mounted data is eventually refreshed, environment variables are not, and applications often still need a restart to reload configuration.
- The best-practices list recommended `create_before_destroy` for all resources where downtime is unacceptable. I changed it to recommend the setting only when the replacement can be created with a non-conflicting name.

## Review Notes
Terraform CLI is not installed in this environment, so I could not run `terraform fmt` or validate the snippets locally. The snippets were reviewed against the official Terraform language documentation and HashiCorp Kubernetes provider schemas.
