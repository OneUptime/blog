# Validation Summary: Using the Terraform Helm Provider to Deploy Charts with Custom Values

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Terraform Helm provider
- HashiCorp Terraform Kubernetes provider
- Helm
- Kubernetes
- AWS EKS authentication
- Kustomize post-rendering
- YAML values files

## Sources Consulted
- Terraform Helm provider v2.12.0 documentation: https://registry.terraform.io/providers/hashicorp/helm/2.12.0/docs
- Terraform Helm provider `helm_release` documentation: https://registry.terraform.io/providers/hashicorp/helm/2.12.0/docs/resources/release
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform sensitive data guidance: https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables
- Helm values files documentation: https://helm.sh/docs/v3/chart_template_guide/values_files/
- Helm install documentation for values precedence and OCI chart references: https://helm.sh/docs/helm/helm_install/
- Helm OCI registries documentation: https://helm.sh/docs/topics/registries/
- Helm post-rendering documentation: https://helm.sh/docs/topics/advanced/#post-rendering
- AWS provider `aws_eks_cluster_auth` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_cluster_auth

## Issues Found
- The base YAML values file used `adminPassword: ${grafana_admin_password}` while the Terraform example loaded that file with `file()`. Terraform does not interpolate variables inside files loaded with `file()`, so this would be passed to Helm literally. Removed the line from the plain values-file example.
- The `set_sensitive` explanation said values are masked in plan output and logs. The official provider documentation guarantees sensitive handling for the value in Terraform diffs, while Terraform sensitive values can still be present in state. Updated the text to say plan output is masked and state must be protected.
- The Kustomize post-render example called `kustomize build` directly. Helm post-renderers must accept rendered manifests on stdin and return valid manifests on stdout, so the direct command would not patch Helm's rendered output. Replaced it with a wrapper script example that writes stdin to `all.yaml`, runs Kustomize, and notes that the overlay must include `all.yaml`.

## Review Notes
- The post pins the Helm provider with `~> 2.12`. The syntax shown matches the 2.x provider documentation, but the latest provider line is 3.x as of this review. Future updates may need to account for provider 3.x schema changes.
- The example chart versions are pinned, which is technically correct for reproducibility, but they may not be the latest chart versions.
