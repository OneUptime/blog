# Validation Summary: How to Test Flux CD Multi-Tenancy Isolation

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Flux CD Kustomizations and multi-tenancy
- Kubernetes RBAC and ServiceAccounts
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota and LimitRange
- kubectl and shell scripting
- GitHub Actions with kind

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux CLI tenant command documentation: https://fluxcd.io/flux/cmd/flux_create_tenant/
- Flux CLI installation and GitHub Actions documentation: https://fluxcd.io/flux/cmd/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/

## Issues Found
- The Flux Kustomization example used `metadata.namespace: flux-system` while the tenant ServiceAccount was created in `tenant-a`. Flux impersonates the ServiceAccount named in `.spec.serviceAccountName` for the Kustomization, and the official RBAC example places the restricted Kustomization and ServiceAccount in the tenant namespace. Changed the Kustomization namespace to `tenant-a` and the source reference name to `tenant-a`.
- The Kustomization example included `validation: client`, which is not part of the current `kustomize.toolkit.fluxcd.io/v1` Kustomization spec. Removed the field.
- The namespace-boundary script only queried Kustomizations in `flux-system`, even though tenant Kustomizations are normally namespaced. Updated it to query all namespaces and operate on namespace/name pairs.
- The namespace-boundary script incremented `ERRORS` inside a piped `while` loop, which would run in a subshell in Bash and lose the accumulated error count. Replaced the pipeline with process substitution so failures affect the outer shell variable.
- The namespace-boundary script printed a success message even after resource-level failures. Added a per-Kustomization resource error counter so the success message only appears when no out-of-namespace resources were found.
- The network isolation script tested HTTP connectivity to a BusyBox pod that was not running an HTTP server, so the cross-tenant check would fail even without NetworkPolicy enforcement. Updated the script to create NGINX server pods and BusyBox client pods.
- The standalone NetworkPolicy test manifest still showed only a non-serving BusyBox pod. Updated it to include matching server and client pods.
- The network isolation script claimed to test same-namespace connectivity but did not actually run a connectivity check. Added the same-namespace HTTP check.
- The comprehensive test suite omitted the network isolation script. Added `test-network-isolation.sh` to the suite.
- The namespace-boundary script requires `jq`, but `jq` was not listed as a prerequisite. Added it to the prerequisites.

## Review Notes
- The NetworkPolicy example assumes the cluster uses a CNI plugin that enforces Kubernetes NetworkPolicy; Kubernetes documents that creating NetworkPolicy resources has no effect without such a plugin.
- The DNS egress rule allows UDP/53 to any namespace. This is functional for a generic example, but production policies usually narrow this to the cluster DNS namespace and labels.
- The ResourceQuota and LimitRange guidance is consistent with Kubernetes behavior: quotas can reject pods without relevant requests or limits, and LimitRanges can provide defaults.
