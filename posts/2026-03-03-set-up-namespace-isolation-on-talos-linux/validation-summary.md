# Validation Summary: How to Set Up Namespace Isolation on Talos Linux

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Talos Linux
- Kubernetes namespaces
- Kubernetes NetworkPolicy
- Cilium CNI
- Kubernetes RBAC
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes Pod Security Standards / Pod Security Admission
- kubectl
- Helm

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security namespace label documentation: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium policy enforcement mode documentation: https://docs.cilium.io/en/stable/security/policy/intro/
- Talos / Sidero Cilium deployment guide: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium

## Issues Found
- The Cilium Helm installation example was too generic for Talos. Updated it to mention setting `cluster.network.cni.name` to `none` before bootstrapping a new Talos cluster when replacing the default CNI, and added the Talos-compatible Cilium Helm values documented by Sidero.
- The reusable `default-deny.yaml` included `metadata.namespace: team-a`, which would fail when applied in a loop with `kubectl -n team-b` or `kubectl -n team-c`. Removed the fixed namespace from that reusable manifest.
- DNS egress and ingress namespace selectors used broad or custom namespace labels. Updated them to use the built-in `kubernetes.io/metadata.name` namespace label for `kube-system` and `ingress-nginx`.
- The RBAC Role mixed core, `apps`, and `batch` resources into one rule. Split the resources by API group so the Role accurately reflects Kubernetes RBAC resource grouping.
- The Pod Security Standards YAML comment said "baseline" while the configured profile was `restricted`. Corrected the comment.
- The `kubectl label namespace` command could fail on existing labels. Added `--overwrite`.
- The automation script accepted a team group but did not use it, and it claimed to configure all controls while omitting RBAC and limit ranges. Added namespace-scoped RBAC and a LimitRange to the script.
- The introduction overstated pod API access by implying any pod can access cluster-wide resources by default. Reworded it to tie API access risk to overly broad permissions.

## Review Notes
The examples are now technically consistent with current Kubernetes APIs and Talos/Cilium installation guidance. In a production article, it would still be useful to mention that NetworkPolicy behavior depends on the installed CNI and that Pod Security `restricted` can require workload manifest changes such as seccomp and non-root settings.
