# Validation Summary: How to Implement Multi-Tenant Namespaces on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config: `cluster.apiServer.extraArgs`)
- Kubernetes RBAC (Role, RoleBinding)
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- Kubernetes ResourceQuota
- Pod Security Standards (`pod-security.kubernetes.io/enforce` labels)
- OPA / Gatekeeper (`constraints.gatekeeper.sh/v1beta1`)
- Capsule multi-tenancy operator (`capsule.clastix.io/v1beta2`)
- Prometheus / Prometheus Operator (`monitoring.coreos.com/v1` PrometheusRule)
- Kubernetes PriorityClass (`scheduling.k8s.io/v1`)
- Kubernetes API Priority and Fairness (APF)
- Helm
- kubectl

## Sources Consulted
- Project Capsule Tenant CRD (source of truth): https://raw.githubusercontent.com/projectcapsule/capsule/main/charts/capsule/crds/capsule.clastix.io_tenants.yaml — confirmed `capsule.clastix.io/v1beta2` is the current storage version, the structure of `ingressOptions.allowedClasses.allowed`, `storageClasses.allowed`, `networkPolicies.items[]` (NetworkPolicySpec), and that `networkPolicies` is now deprecated in favor of Tenant Replications
- Project Capsule documentation: https://projectcapsule.dev/docs/
- Project Capsule Helm chart repo: https://projectcapsule.github.io/charts (current, after the move from clastix/capsule to projectcapsule/capsule)
- Kubernetes NetworkPolicy reference (NetworkPolicyPeer / NetworkPolicyEgressRule structure)
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/ and admission labels at https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes RBAC reference: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ResourceQuota reference: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes API Priority and Fairness: https://kubernetes.io/docs/concepts/cluster-administration/flow-control/ (GA in 1.29; `--enable-priority-and-fairness` flag defaults to true)
- Talos Linux machine config docs: https://www.talos.dev/latest/reference/configuration/ (confirms `cluster.apiServer.extraArgs` map format)
- OPA Gatekeeper constraint framework: https://open-policy-agent.github.io/gatekeeper/website/docs/howto/

## Issues Found
1. **Invalid YAML indentation in the Capsule Tenant `networkPolicies` egress rule (DNS peer).** The `podSelector` for `kube-dns` was at the same indentation as the `-` of the array item rather than at the same column as the sibling `namespaceSelector`. As written, it would either fail to parse or be interpreted as a key on the egress rule itself (not on the NetworkPolicyPeer), so the DNS allow-list would not actually attach a pod selector to the kube-system namespace. **Fixed** by indenting `podSelector` (and its children) two more columns so it sits inside the `- namespaceSelector:` peer.
2. **Two `PriorityClass` resources in a single YAML document without a `---` separator.** As written, `kubectl apply -f` would either reject the duplicate top-level keys or silently use only the last definition. **Fixed** by adding a `---` document separator between the two `PriorityClass` definitions.

## Review Notes
- The `networkPolicies` field on the Capsule Tenant CRD is marked **deprecated** upstream in favor of [Tenant Replications](https://projectcapsule.dev/docs/replications/). The example still works on current Capsule versions, but readers should be aware they may need to migrate to Replications on a future release.
- `kubectl label namespace ... pod-security.kubernetes.io/enforce-version=latest` is accepted, but the upstream Pod Security Admission guidance recommends pinning to a concrete Kubernetes minor (e.g. `v1.30`) rather than `latest`, so the enforced rule set does not silently change when the control plane is upgraded. Not changed because it is technically valid.
- The `--enable-priority-and-fairness` kube-apiserver flag has defaulted to `true` since APF reached GA in Kubernetes 1.29, so the Talos `extraArgs` snippet is correct but largely redundant on modern clusters.
- `K8sBlockHostPath` is presented as an example Gatekeeper constraint; it is not a built-in template and requires a matching `ConstraintTemplate`. The post frames it as an example, so this is acceptable.
- The `kubectl auth can-i` exit-code logic in `verify-tenant-isolation.sh` is correct (`0` = allowed, `1` = denied), so the PASS/FAIL branches are not inverted.
- Gatekeeper's `match.namespaces` field does support glob patterns such as `tenant-*`, so that snippet is valid.
