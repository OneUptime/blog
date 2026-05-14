# Validation Summary: How to Explain the Calico API Server to Your Team

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico API server
- Calico native `projectcalico.org/v3` CRDs
- Kubernetes API aggregation
- Kubernetes RBAC
- Kubernetes audit logging
- `kubectl`
- `calicoctl`

## Sources Consulted
- Calico documentation: Enable kubectl to manage Calico APIs - https://docs.tigera.io/calico/latest/operations/install-apiserver
- Calico documentation: Enable native v3 CRDs - https://docs.tigera.io/calico/latest/operations/native-v3-crds
- Calico documentation: Configure RBAC for tiered policies - https://docs.tigera.io/calico/latest/network-policy/policy-tiers/rbac-tiered-policies
- Calico documentation: Component architecture - https://docs.tigera.io/calico/latest/reference/architecture/overview
- Calico documentation: The Calico datastore - https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Kubernetes documentation: API Aggregation Layer - https://kubernetes.io/docs/concepts/api-extension/apiserver-aggregation/
- Kubernetes documentation: Using RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes documentation: Auditing - https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/

## Issues Found
- The post framed the aggregated Calico API server as the current best practice for production without mentioning that Calico now marks it deprecated. Updated the introduction and best practices to note native `projectcalico.org/v3` CRDs as the forward-looking option for new installations.
- The post implied CRDs could not cleanly expose the full Calico API. Updated the explanation to reflect Calico's native v3 CRD mode and its documented behavioral differences from API-server mode.
- The post used overlapping CIDRs as an example of an invalid policy. Overlap validation applies to IPPools, not network policies, so the example now refers to invalid Calico resources and specifically names IPPools.
- The RBAC section said access control without the API server is effectively all-or-nothing through direct datastore access. Updated this to account for native v3 CRDs and their documented read-operation caveat for tier RBAC.
- The audit logging section claimed every policy change goes through the Kubernetes API server whenever the Calico API server is enabled. Updated it to scope the claim to changes made through `kubectl` and the Kubernetes API path, with audit logging configured to record those requests.
- The policy-enforcement answer said Felix reads from Kubernetes CRDs and datastore rather than the API server. Reworded it to the more accurate point that Felix programs policy from Calico datastore state and the API server is not in the enforcement request path.

## Review Notes
The remaining command and RBAC snippets are syntactically valid examples for clusters exposing Calico resources through the `projectcalico.org` API group. The audit log `grep` command is intentionally environment-dependent because Kubernetes audit log location and policy vary by distribution and cluster configuration.
