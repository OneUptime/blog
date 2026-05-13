# Validation Summary: How to Configure Flux Receiver for Cross-Namespace Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller Receiver API
- Kubernetes RBAC
- Kubernetes namespaces
- GitRepository and Kustomization custom resources
- kubectl and Flux CLI

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux notification-controller options: https://fluxcd.io/flux/components/notification/options/
- Flux current install manifest: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
- Flux Image Update Automation API reference v1: https://fluxcd.io/flux/components/image/automation-api/v1/

## Issues Found
- The post incorrectly stated that a Flux Receiver can only trigger reconciliation in its own namespace by default. The Receiver API supports a `namespace` field in each resource reference, and the defaulting behavior is that an omitted namespace resolves to the Receiver's namespace. I updated the wording to describe that behavior accurately.
- The post implied that default Flux RBAC only lets notification-controller patch resources in its own namespace. Current standard Flux install manifests bind notification-controller to the Flux `crd-controller` ClusterRole, which grants cluster-wide permissions over Flux custom resources. I changed the RBAC section to apply to hardened or custom restricted installs.
- The post did not mention Flux's `--no-cross-namespace-refs=true` security flag, which prevents cross-namespace Receiver references regardless of RBAC. I added this caveat in the introduction, RBAC section, and troubleshooting notes.
- The per-namespace Receiver section referred generically to `webhook-token` even though the example uses `team-alpha-webhook-token`. I corrected the secret name.

## Review Notes
The YAML examples use current Flux `v1` API versions for Receiver, GitRepository, Kustomization, ImageRepository, ImagePolicy, and ImageUpdateAutomation references. The broad ClusterRole example is technically valid but should only be used where its cluster-wide scope matches the cluster's tenancy model.
