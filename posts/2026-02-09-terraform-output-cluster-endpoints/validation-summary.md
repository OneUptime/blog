# Validation Summary: How to Use Terraform Output Values to Export Kubernetes Cluster Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform output values
- Terraform remote state
- HashiCorp AWS Terraform provider
- HashiCorp Kubernetes Terraform provider
- Amazon EKS
- Kubernetes Services, Ingresses, ConfigMaps, Secrets, and Namespaces
- kubectl rollout commands

## Sources Consulted
- Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- Terraform `terraform output` command reference: https://developer.hashicorp.com/terraform/cli/commands/output
- Terraform `terraform_remote_state` data source reference: https://developer.hashicorp.com/terraform/language/state/remote-state-data
- HashiCorp Kubernetes provider `kubernetes_service` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service
- HashiCorp Kubernetes provider `kubernetes_secret` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- HashiCorp Kubernetes provider `kubernetes_ingress_v1` resource docs: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/ingress_v1
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes deprecated annotation reference for `kubernetes.io/ingress.class`: https://kubernetes.io/docs/reference/labels-annotations-taints/
- HashiCorp AWS provider `aws_eks_cluster` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_cluster
- HashiCorp AWS provider `aws_eks_cluster_auth` data source docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_cluster_auth
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- LoadBalancer endpoint examples assumed every Kubernetes Service status ingress exposes `hostname`. The Kubernetes provider documents both `hostname` and `ip` fields, so I changed status-based outputs to use `coalesce(hostname, ip)`.
- The shown LoadBalancer Service resources read status ingress values but did not request provider-side waiting for a load balancer endpoint. I added `wait_for_load_balancer = true` to the Service examples that define LoadBalancer resources.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. I changed it to `spec.ingress_class_name = "nginx"` and updated the structured output to read `spec[0].ingress_class_name`.
- The Kubernetes Secret example base64-encoded values in the provider `data` map. The provider expects normal string data there, with `binary_data` used for base64-encoded binary data, so I changed the values to `var.api_key` and `var.db_password`.
- The sensitive output explanation was too broad. I clarified that sensitive outputs are redacted in plan/apply and when listing all outputs, but are stored in state and can be shown through specific output queries or `-json`/`-raw`.
- The remote-state Kubernetes provider example only set `host`, which is not enough for a usable EKS provider configuration. I added a CA output, an `aws_eks_cluster_auth` data source, and `cluster_ca_certificate` / `token` provider settings.

## Review Notes
The examples are still illustrative snippets and omit surrounding provider blocks, variables, IAM roles, deployments, and some referenced resources. The EKS token examples are technically valid, but EKS authentication tokens are temporary; in production, using the Kubernetes provider `exec` authentication pattern can be preferable to storing generated tokens in Terraform outputs or state.
