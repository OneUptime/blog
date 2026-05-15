# Validation Summary: How to Use Capsule with Flux CD for Multi-Tenancy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Capsule
- Flux CD
- Kubernetes
- Kustomize
- Helm
- Kubernetes RBAC
- Kubernetes ResourceQuota, LimitRange, and NetworkPolicy

## Sources Consulted
- Capsule installation documentation: https://projectcapsule.dev/docs/operating/setup/installation/
- Capsule API reference: https://projectcapsule.dev/docs/reference/
- Capsule quotas documentation: https://projectcapsule.dev/docs/tenants/quotas/
- Capsule replications documentation: https://projectcapsule.dev/docs/replications/
- Capsule Flux guide: https://projectcapsule.dev/docs/guides/use-fluxcd/
- Capsule v0.12.4 Tenant CRD: https://raw.githubusercontent.com/projectcapsule/capsule/v0.12.4/charts/capsule/crds/capsule.clastix.io_tenants.yaml
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The Tenant owner examples used `name: team-alpha` with a separate `namespace` field. Capsule `v1beta2` Tenant owners do not define a `namespace` field, and the official Flux/Capsule guide uses the full Kubernetes ServiceAccount username for ServiceAccount owners. Updated the owner name to `system:serviceaccount:team-alpha:team-alpha` and removed the unsupported `namespace` field.
- The registry restriction was shown as a second full Tenant object with the same name. That is not a valid Kustomize layout and can conflict with the main Tenant definition. Changed the example to show fields added to the existing Tenant spec.
- The namespace count command queried `.status.namespaces`, which returns the namespace list, while the text says it checks the count. Updated the command to query `.status.size`.
- The feature summary said Capsule applies network policies automatically. Capsule can distribute configured NetworkPolicy resources, but it does not create arbitrary network policies by default. Reworded this to "Distributes network policies to tenant namespaces."

## Review Notes
The post is technically valid after the fixes. For a production-grade setup, the Capsule Flux guide also discusses Capsule Proxy, Flux multi-tenancy lockdown flags, and CapsuleConfiguration user groups for tenant GitOps reconcilers; those are useful follow-up hardening details but were not added because the requested review scope was to correct technical errors without restructuring the post.
