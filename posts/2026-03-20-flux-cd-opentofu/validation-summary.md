# Validation Summary: How to Deploy Flux CD with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HashiCorp Helm provider
- HashiCorp Kubernetes provider
- Flux CD
- Flux Operator
- Kubernetes
- Slack notifications
- HCL

## Sources Consulted
- Flux Operator `FluxInstance` documentation: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux notification `Provider` documentation: https://fluxcd.io/flux/components/notification/providers/
- HashiCorp Helm provider documentation: https://github.com/hashicorp/terraform-provider-helm/blob/main/docs/index.md
- HashiCorp Kubernetes provider documentation: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/templates/index.md.tmpl
- HashiCorp `kubernetes_manifest` resource documentation: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/templates/resources/manifest.md.tmpl
- HashiCorp tutorial on managing custom resources with Terraform: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider#managing-custom-resources
- Flux Operator release `v0.48.0`: https://github.com/controlplaneio-fluxcd/flux-operator/releases/tag/v0.48.0
- Flux release `v2.8.6`: https://github.com/fluxcd/flux2/releases/tag/v2.8.6
- HashiCorp Helm provider release `v3.1.1`: https://github.com/hashicorp/terraform-provider-helm/releases/tag/v3.1.1
- HashiCorp Kubernetes provider release `v3.1.0`: https://github.com/hashicorp/terraform-provider-kubernetes/releases/tag/v3.1.0

## Issues Found
- The provider configuration was incomplete. The post configured the Helm provider but omitted a separate `kubernetes` provider block even though the examples use `kubernetes_namespace`, `kubernetes_secret`, and `kubernetes_manifest` resources. A matching `provider "kubernetes"` block was added.
- The pinned provider versions were stale. They were updated to the current `3.1` major line for both the Helm and Kubernetes providers, and the Helm provider syntax was updated to the documented `kubernetes = { ... }` form used by current releases.
- The Flux Operator chart version was outdated. It was updated from `0.8.0` to `0.48.0`, the current Flux Operator release as of April 30, 2026.
- The post implied that the custom resources could be applied in one pass. HashiCorp documents that `kubernetes_manifest` requires the CRD schema at plan time, so the post was corrected to call out staged OpenTofu applies for the `FluxInstance` and notification resources.
- The SSH secret example did not match the current Flux Operator SSH sync secret format. The unnecessary `identity.pub` entry was removed, and the example now matches the documented `identity` and `known_hosts` fields.
- The Slack notification example used the wrong provider fields for the documented Slack bot flow and did not create the backing secret. It was corrected to create a `slack-bot-token` secret and use `address`, `channel`, and `secretRef` in the `Provider` spec.
- Two best-practice bullets made overly broad or inaccurate claims. They were rewritten to stay consistent with how Flux sync configuration and Git authentication are actually documented.

## Review Notes
- The post is now technically sound, but readers still need multiple OpenTofu applies because Flux Operator and Flux notification resources are backed by CRDs that must already exist when `kubernetes_manifest` is planned.
- The `distribution.version = "2.x"` setting is valid and supported by Flux Operator, but it intentionally tracks the latest Flux 2.x release rather than pinning to a single patch version.
