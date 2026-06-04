# Validation Summary: How to Build a Pulumi Component Resource

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Pulumi ComponentResource
- Pulumi TypeScript SDK
- Pulumi Kubernetes provider
- Kubernetes namespaces
- Kubernetes ResourceQuota
- Kubernetes NetworkPolicy
- Kubernetes RBAC RoleBinding
- Kubernetes labels and annotations

## Sources Consulted
- Pulumi Component Resources documentation: https://www.pulumi.com/docs/iac/concepts/components/
- Pulumi Inputs and Outputs documentation: https://www.pulumi.com/docs/iac/concepts/inputs-outputs/
- Pulumi Kubernetes Namespace API docs: https://www.pulumi.com/registry/packages/kubernetes/api-docs/core/v1/namespace/
- Pulumi Kubernetes ResourceQuota API docs: https://www.pulumi.com/registry/packages/kubernetes/api-docs/core/v1/resourcequota/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes labels documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes well-known labels, annotations, and taints reference: https://kubernetes.io/docs/reference/labels-annotations-taints/

## Issues Found
- The post said component resources "exist only in your program." This was corrected to explain that component resources appear in Pulumi state and the Pulumi resource graph, but do not create a Kubernetes API object themselves.
- The basic namespace example used `new Date().toISOString()` for a `created-at` annotation. This would change on every Pulumi program execution and cause unnecessary diffs, so the dynamic timestamp annotation was removed.
- The NetworkPolicy section did not mention that Kubernetes NetworkPolicy enforcement depends on a supporting network plugin. A short caveat was added before the example.
- The egress DNS allowance only opened UDP port 53. DNS can also use TCP port 53, so the example now allows both UDP and TCP for DNS.

## Review Notes
The examples are illustrative and use partial snippets in later sections. The Pulumi and Kubernetes resource types, quota keys, namespace selector label, and RBAC ClusterRole names are consistent with current official documentation.
