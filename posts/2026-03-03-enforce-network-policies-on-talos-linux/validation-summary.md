# Validation Summary: How to Enforce Network Policies on Talos Linux

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- Talos Linux (machine config, CNI selection)
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- Cilium CNI (CiliumNode CRD, Hubble, Hubble UI)
- Calico CNI
- Flannel CNI
- CoreDNS / kube-dns
- Kyverno (ClusterPolicy generate rules)
- kubectl
- nicolaka/netshoot test image

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Talos Linux CNI / machine config docs: https://www.talos.dev/latest/kubernetes-guides/network/
- Sidero Labs Flannel CNI docs: https://docs.siderolabs.com/kubernetes-guides/cni/flannel
- Cilium Hubble UI docs: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium CRD / CiliumNode docs: https://docs.cilium.io/en/stable/network/kubernetes/ipam-crd/
- Kyverno generate rule docs: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Kyverno NetworkPolicy generation policy example: https://kyverno.io/policies/other/generate-networkpolicy-existing/
- Kubernetes DNS debugging (kube-dns label): https://kubernetes.io/docs/tasks/administer-cluster/dns-debugging-resolution/

## Issues Found
No technical issues found. All verified items:
- The claim that Talos's default Flannel does not enforce NetworkPolicies is correct.
- `cluster.network.cni.name: none` is the correct Talos machine config to disable the default CNI.
- The `networking.k8s.io/v1` NetworkPolicy manifests are syntactically and semantically correct (podSelector, policyTypes, ingress/egress, namespaceSelector + podSelector intersection, ipBlock with except, default port-protocol behavior).
- `k8s-app: kube-dns` is the correct label for both CoreDNS and the legacy kube-dns deployment.
- `cilium hubble enable --ui` is the correct command; `hubble-ui` Service in `kube-system` listens on port 80, making the `kubectl port-forward` example valid.
- `kubectl get ciliumnodes` is a valid command backed by the CiliumNode CRD.
- The Kyverno ClusterPolicy `generate` rule structure (kind/apiVersion/name/namespace/data.spec) is valid.

## Review Notes
- The Talos `inlineManifests` example uses a placeholder comment for Cilium contents and is paired with a sentence telling the reader to apply Cilium via Helm after bootstrap. This is fine as illustrative scaffolding, but readers should be aware that a real `inlineManifests` entry needs actual rendered manifests (e.g., the output of `helm template cilium/cilium ...`) rather than a comment.
- The Kyverno generate rule would benefit from `synchronize: true` so the generated NetworkPolicy is kept in sync if mutated/deleted, but its absence is not a technical error.
- Starting in Talos 1.13, Flannel can optionally be patched with `kubeNetworkPoliciesEnabled: true` to gain NetworkPolicy enforcement. The post's recommendation to switch to Cilium/Calico remains valid and is the more commonly used path.
- The `allow-dns` policy in the "Allowing DNS Traffic" section selects DNS pods by label in any namespace; tightening it with `namespaceSelector: matchLabels: kubernetes.io/metadata.name: kube-system` would be marginally safer but is not incorrect.
