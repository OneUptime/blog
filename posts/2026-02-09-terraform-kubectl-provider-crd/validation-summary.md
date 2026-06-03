# Validation Summary: Using the Terraform kubectl Provider to Manage CRDs and Raw Kubernetes Manifests

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform kubectl provider (`gavinbunney/kubectl`)
- Terraform Kubernetes provider (`hashicorp/kubernetes`)
- Terraform HTTP provider (`hashicorp/http`)
- Kubernetes CRDs and custom resources
- Kubernetes server-side apply
- Helm / kube-prometheus-stack
- cert-manager

## Sources Consulted
- Terraform Registry: gavinbunney/kubectl provider documentation - https://registry.terraform.io/providers/gavinbunney/kubectl/latest/docs
- Terraform Registry: gavinbunney/kubectl `kubectl_manifest` resource documentation - https://registry.terraform.io/providers/gavinbunney/kubectl/latest/docs/resources/kubectl_manifest
- Terraform Registry: gavinbunney/kubectl `kubectl_file_documents` data source documentation - https://registry.terraform.io/providers/gavinbunney/kubectl/latest/docs/data-sources/kubectl_file_documents
- gavinbunney/terraform-provider-kubectl source for `kubectl_manifest` schema and server-side apply behavior - https://github.com/gavinbunney/terraform-provider-kubectl/blob/master/kubernetes/resource_kubectl_manifest.go
- gavinbunney/terraform-provider-kubectl source for provider configuration schema - https://github.com/gavinbunney/terraform-provider-kubectl/blob/master/kubernetes/provider.go
- HashiCorp Developer: Manage Kubernetes resources with Terraform - https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- Terraform Registry: hashicorp/kubernetes `kubernetes_manifest` resource documentation - https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Kubernetes documentation: Server-Side Apply - https://kubernetes.io/docs/reference/using-api/server-side-apply/
- Terraform Registry: hashicorp/http data source documentation - https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- cert-manager v1.14 Certificate resource documentation - https://cert-manager.io/v1.14-docs/usage/certificate/
- prometheus-community kube-prometheus-stack values - https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- cert-manager v1.14.0 CRD release asset - https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.crds.yaml

## Issues Found
- The post incorrectly said the official `hashicorp/kubernetes` provider cannot manage CRDs or arbitrary custom resources. Updated the wording to acknowledge `kubernetes_manifest`, while keeping the kubectl provider positioning focused on raw YAML workflows and the CRD plan-time schema caveat.
- The provider attribution said "Gavin Barron"; corrected it to "Gavin Bunney", matching the `gavinbunney/kubectl` provider source.
- The setup snippet used older provider version constraints and omitted the `hashicorp/http` provider even though the CRD example uses `data "http"`. Updated the version constraints to current documented versions and added the HTTP provider declaration.
- The directory example only applied the first YAML document from each file by using `values(each.value)[0]`. Replaced it with a `merge([... ]...)` expression so every document returned by `kubectl_file_documents` is applied.
- The server-side apply example used `field_manager = "terraform"`, but `gavinbunney/kubectl` does not expose a `field_manager` argument. Removed the unsupported argument and added that the provider uses `kubectl` as the field manager when server-side apply is enabled.
- The wait conditions section used an unsupported generic `wait_for` block on `kubectl_manifest`. Replaced it with the provider-supported `wait_for_rollout` behavior for Deployment/APIService rollouts and a valid Deployment example.

## Review Notes
- The cert-manager `Certificate` example uses Go duration strings (`2160h`, `360h`), which is consistent with cert-manager documentation.
- The kube-prometheus-stack value `crds.enabled = false` matches the current chart values pattern for disabling chart-managed CRDs.
- The import format shown for `kubectl_manifest` matches the provider documentation for namespaced resources; cluster-scoped resources omit the namespace component.
