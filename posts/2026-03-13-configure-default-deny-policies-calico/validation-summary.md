# Validation Summary: How to Configure Default Deny Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Calico `GlobalNetworkPolicy`
- Calico `NetworkPolicy`
- `calicoctl`
- Kubernetes network policy behavior
- Kubernetes `kubectl`

## Sources Consulted
- Calico Open Source documentation: Enable a default deny policy for Kubernetes pods: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico Open Source documentation: Global network policy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source documentation: Get started with Calico network policy: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico Open Source documentation: `calicoctl get`: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: `calicoctl apply`: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The introduction said the guide covered both namespace-scoped and global approaches, but the post only provides a global `GlobalNetworkPolicy` implementation. Changed the wording to say it covers a global approach.
- Step 2 described `order: 1000` as a "low order value" that matches last. Calico applies policies with lower `order` values first, so `1000` is a higher order value intended to run after lower-order allow policies. Updated the explanation.

## Review Notes
- The default-deny and DNS allow `GlobalNetworkPolicy` examples are valid Calico `projectcalico.org/v3` resources.
- `calicoctl get` accepts pluralized resource types and supports `--all-namespaces`; `calicoctl apply -f` is valid for applying Calico policy manifests.
- Calico's official best-practice guidance recommends scoping global default-deny policies away from system namespaces such as `kube-system` and `calico-system` to avoid disrupting control-plane or Calico components. The post's cluster-wide `selector: all()` example is technically valid, but operators should apply it carefully in staging and account for system traffic before enforcing it in production.
