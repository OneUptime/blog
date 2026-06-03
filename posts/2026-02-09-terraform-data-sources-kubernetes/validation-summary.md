# Validation Summary: Using Terraform Data Sources to Query Existing Kubernetes Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform data sources
- HashiCorp Kubernetes provider
- HashiCorp Helm provider
- Kubernetes ConfigMaps, Secrets, Services, ServiceAccounts, Deployments, Namespaces, and PersistentVolumeClaims
- Cloudflare Terraform provider DNS records
- Terraform external data source with kubectl and jq

## Sources Consulted
- Terraform data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- HashiCorp Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- Kubernetes provider `kubernetes_config_map` data source: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/data-sources/config_map
- Kubernetes provider `kubernetes_secret` data source: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/data-sources/secret
- Kubernetes provider `kubernetes_service` data source: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/data-sources/service
- Kubernetes provider `kubernetes_service_account` data source: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/data-sources/service_account
- Kubernetes provider `kubernetes_persistent_volume_claim` data source: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/data-sources/persistent_volume_claim
- Kubernetes provider `kubernetes_all_namespaces` data source: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/data-sources/all_namespaces
- Kubernetes provider `kubernetes_resource` data source: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/data-sources/resource
- HashiCorp Helm provider `helm_release` resource: https://registry.terraform.io/providers/hashicorp/helm/latest/docs/resources/release
- Cloudflare Terraform DNS records documentation: https://developers.cloudflare.com/api/terraform/resources/dns/subresources/records/

## Issues Found
- The Kubernetes provider version pin used `~> 2.27`, while the article also referenced newer provider capabilities and current schemas. Updated it to `~> 3.1` to align with current provider documentation.
- The `cluster-info` ConfigMap example attempted to read `data["ca.crt"]`, but that ConfigMap exposes kubeconfig data. Changed the output to read `data["kubeconfig"]`.
- The `kubernetes_deployment` examples were missing required pod template metadata and matching selector labels. Added labels, selectors, and template metadata so the examples match the provider's deployment schema.
- The Cloudflare DNS example used the older `cloudflare_record` resource and deprecated `value` field. Updated it to `cloudflare_dns_record` with `content`.
- The service account token example used the deprecated `default_secret_name` attribute, which is empty for many Kubernetes 1.24+ clusters. Updated the example to read an explicitly created token Secret by name and added the Kubernetes 1.24 caveat.
- The Helm example used old `set` block syntax. Updated it to the current Helm provider `set = [{ ... }]` syntax.
- The Istio injection example placed the sidecar annotation on the Deployment metadata instead of the pod template metadata. Moved it to `spec.template.metadata.annotations` and made the snippet structurally complete.
- The article mentioned a non-existent `kubernetes_resources` data source for bulk listing. Replaced this with accurate wording about `kubernetes_all_namespaces` and the provider's lack of arbitrary bulk-list support.

## Review Notes
The Terraform CLI is not installed in the local environment, so examples were validated against official provider documentation rather than by running `terraform validate`.
