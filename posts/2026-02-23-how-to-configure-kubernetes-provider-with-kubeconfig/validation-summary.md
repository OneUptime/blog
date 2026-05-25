# Validation Summary: How to Configure Kubernetes Provider with Kubeconfig

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Kubernetes provider
- HashiCorp Helm provider
- Kubernetes kubeconfig
- kubectl
- Amazon EKS and AWS CLI
- Google Kubernetes Engine and gcloud CLI
- Azure Kubernetes Service and Azure CLI

## Sources Consulted
- HashiCorp Terraform Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- HashiCorp Terraform Helm provider documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs
- Terraform provider configuration reference: https://developer.hashicorp.com/terraform/language/providers/configuration
- Terraform provider aliases reference: https://developer.hashicorp.com/terraform/language/providers/configuration#alias
- Terraform yamldecode function reference: https://developer.hashicorp.com/terraform/language/functions/yamldecode
- Kubernetes kubeconfig v1 reference: https://kubernetes.io/docs/reference/config-api/kubeconfig.v1/
- AWS CLI eks update-kubeconfig reference: https://docs.aws.amazon.com/cli/latest/reference/eks/update-kubeconfig.html
- AWS CLI eks get-token reference: https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- Amazon EKS kubeconfig user guide: https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html
- Google Cloud gcloud container clusters get-credentials reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- Azure CLI az aks get-credentials reference: https://learn.microsoft.com/en-us/cli/azure/aks

## Issues Found
- The inline kubeconfig section implied arbitrary kubeconfig content could be passed directly while the example only works for simple static-token kubeconfigs. Updated the wording to clarify that limitation.
- The inline kubeconfig example included `config_path = null` with a comment about `config_paths`, even though the example was using explicit `host`, `cluster_ca_certificate`, and `token` settings. Removed the misleading line and replaced the comment with one that matches the configuration approach.
- The example that wrote kubeconfig content with a Terraform `local_file` resource and then referenced that resource from the Kubernetes provider could be problematic because provider configuration should use values known before apply. Replaced it with a `kubeconfig_path` variable representing a file generated before Terraform runs.
- The Helm provider example used the older nested block syntax. Updated it to the current Helm provider v3 nested object syntax, `kubernetes = { ... }`.
- The GKE troubleshooting command used `gcloud auth application-default login`, but `gcloud container clusters get-credentials` uses the gcloud identity by default unless application-default credentials are explicitly configured. Changed it to `gcloud auth login`.

## Review Notes
- Terraform CLI was not installed in the workspace, so local `terraform fmt` or validation commands could not be run.
- The Kubernetes provider version constraint `~> 2.35` remains valid for the post's Kubernetes provider examples. The Helm provider syntax was updated for the current Helm provider documentation because the post did not pin a Helm provider version.
