# Validation Summary: How to Set Up Extra Manifests in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Talos `cluster.extraManifests`, `cluster.inlineManifests`, and `cluster.extraManifestHeaders`
- Kubernetes manifests
- Kubernetes RBAC
- Kubernetes StorageClass and ResourceQuota resources
- CNI deployment patterns
- GitOps bootstrap workflows

## Sources Consulted
- Talos inlineManifests and extraManifests guide: https://docs.siderolabs.com/kubernetes-guides/advanced-guides/inlinemanifests
- Talos v1.13 machine configuration reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Talos Cilium CNI deployment guide: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Upstream manifest URL checks for Flannel, MetalLB, local-path-provisioner, Cilium, and metrics-server release assets.

## Issues Found
- The post said extra manifests "run once during bootstrap" and are "applied in order." Talos documentation says manifests are reconciled during bootstrap, on boot, after failures, and when manifest configuration changes, and that Talos sorts resources before applying them. Updated the wording and the ordering section.
- The inline manifest `name` field was described as tracking applied manifests. The Talos configuration reference only defines it as the manifest name and says it should be unique. Updated the explanation.
- The Cilium example used `cluster.network.cni.name: custom` with `cluster.extraManifests`, and referenced a Cilium `quick-install.yaml` URL that currently returns 404. Updated the example to use `name: none` for an extraManifest-managed CNI, replaced the broken URL with a hosted Talos-compatible rendered manifest placeholder, and noted that `name: custom` should use `cluster.network.cni.urls`.
- The post implied normal machine config reapplication updates existing Kubernetes resources from extra manifests. Talos uses an additive approach for these resources and does not update or delete existing objects during normal reconciliation. Updated the post-bootstrap section to clarify this and to recommend kubectl, Helm, or GitOps for ongoing changes.

## Review Notes
The remaining Kubernetes YAML examples use current API versions and valid resource shapes. The example manifest URLs for Flannel, MetalLB v0.14.3, rancher/local-path-provisioner v0.0.26, and metrics-server latest release assets responded successfully during review.
