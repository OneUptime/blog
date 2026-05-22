# Validation Summary: How to Use kubectl Provider for Raw Manifests in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Kubernetes
- gavinbunney/kubectl Terraform provider
- HashiCorp Kubernetes Terraform provider
- HashiCorp HTTP Terraform provider
- YAML manifests
- Kubernetes CRDs and custom resources
- Kubernetes Server-Side Apply

## Sources Consulted
- gavinbunney/kubectl provider README and installation guidance: https://github.com/gavinbunney/terraform-provider-kubectl
- gavinbunney/kubectl `kubectl_manifest` resource documentation/source: https://raw.githubusercontent.com/gavinbunney/terraform-provider-kubectl/master/docs/resources/kubectl_manifest.md
- gavinbunney/kubectl `kubectl_file_documents` data source documentation: https://raw.githubusercontent.com/gavinbunney/terraform-provider-kubectl/master/docs/data-sources/kubectl_file_documents.md
- gavinbunney/kubectl provider schema/source for `server_side_apply`, `force_conflicts`, and `wait_for_rollout`: https://raw.githubusercontent.com/gavinbunney/terraform-provider-kubectl/master/kubernetes/resource_kubectl_manifest.go
- gavinbunney/kubectl provider configuration schema/source for kubeconfig settings: https://raw.githubusercontent.com/gavinbunney/terraform-provider-kubectl/master/kubernetes/provider.go
- Kubernetes Server-Side Apply documentation: https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform `templatefile` function documentation: https://developer.hashicorp.com/terraform/language/functions/templatefile
- Terraform `file` function documentation: https://developer.hashicorp.com/terraform/language/functions/file

## Issues Found
- The Server-Side Apply example used a nested `field_manager` block with `name` and `force_conflicts`. That schema is not supported by the `gavinbunney/kubectl` provider used in the article. I changed the example to use the supported top-level `force_conflicts = true` argument with `server_side_apply = true`.
- The post described `wait_for_rollout` as waiting for arbitrary resources, including a cert-manager `Certificate`, to become ready. The `gavinbunney/kubectl` provider only waits for `Deployment` and `APIService` rollout. I removed the `Certificate` `wait_for_rollout` setting and corrected the multi-document bundle comment.
- The CRD installation example claimed `wait_for_rollout` waits for a CRD to be fully registered. The provider does not implement CRD registration waiting through that flag. I removed the misleading `wait_for_rollout` setting from the CRD example and left the explicit `depends_on` ordering for custom resources.

## Review Notes
The examples are otherwise consistent with the provider documentation: `kubectl_manifest`, `kubectl_file_documents.manifests`, `override_namespace`, `sensitive_fields`, kubeconfig settings, Terraform `file`, and Terraform `templatefile` are used plausibly. `wait_for_rollout` defaults to true in the provider, but it only has rollout behavior for supported kinds such as Deployments and APIServices, so future examples should avoid presenting it as a general readiness mechanism for CRDs or custom resources.
