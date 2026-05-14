# Validation Summary: How to Deploy Global Resources Across Clusters with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes multi-cluster GitOps
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota and LimitRange
- Kubernetes Pod Security Admission labels
- Kustomize
- Prometheus node exporter

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Pod Security namespace labels documentation: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Service NodePort documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Prometheus node exporter releases: https://github.com/prometheus/node_exporter/releases
- Prometheus node exporter container guidance: https://hub.docker.com/r/prom/node-exporter

## Issues Found
- The developer Role claimed developers could not access secrets, but it granted `get` and `list` on `secrets`. Removed the secrets rule so the YAML matches the stated access policy.
- The read-only ClusterRole attempted to "deny" secret access by adding a narrower secrets rule after a wildcard rule. Kubernetes RBAC is additive and has no deny rules, so the wildcard rule still granted secret access. Replaced the wildcard resource list with explicit read-only non-secret resources.
- The validation script filtered ClusterRoleBindings with `-l managed-by=flux`, but the RBAC examples did not apply that label. Added `managed-by: flux` labels to the global RBAC resources and other global resources for consistency.
- The DNS NetworkPolicy comment said it allowed kube-dns, but the rule allowed TCP/UDP 53 to any pod in `kube-system`. Added a `podSelector` for `k8s-app: kube-dns` to align the rule with the comment.
- The node exporter image tag `v1.7.0` was outdated. Updated the example to `quay.io/prometheus/node-exporter:v1.11.1`, which is current as of the validation date.
- The Flux `force` comment described overwriting manual changes. Flux uses `spec.force` for replacing resources when patching fails due to immutable field changes. Updated the comment and troubleshooting guidance accordingly.

## Review Notes
- YAML code blocks were parsed successfully after the edits.
- `kubectl` and `flux` were not installed in the workspace, so CLI behavior was verified against official documentation rather than local `--help` output.
- The NetworkPolicy examples require a CNI plugin that enforces NetworkPolicy; creating NetworkPolicy objects alone has no effect without such a plugin.
