# Validation Summary: How to Configure Kubernetes Network Policies for Zero-Trust Security

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Kubernetes Network Policies (`networking.k8s.io/v1`)
- CNI plugins (Calico, Cilium, Weave Net, Flannel)
- Cilium Network Policies (`cilium.io/v2`, L7 HTTP filtering, FQDN-based egress)
- Cilium Hubble
- kubectl
- Kustomize

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- NetworkPolicy API reference (`networking.k8s.io/v1`): https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Kubernetes automatic namespace labels (`kubernetes.io/metadata.name`, GA since 1.21): https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/#automatic-labelling
- Cilium Network Policy documentation: https://docs.cilium.io/en/stable/security/policy/
- Cilium L7 HTTP policy reference: https://docs.cilium.io/en/stable/security/policy/language/#layer-7-examples
- Cilium DNS/FQDN egress (`toFQDNs`): https://docs.cilium.io/en/stable/security/policy/language/#dns-based
- kubectl run reference (`--expose`, `--port`): https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- Cilium Hubble setup: https://docs.cilium.io/en/stable/observability/hubble/

## Issues Found
No technical issues found.

All YAML manifests are syntactically correct and use current, non-deprecated APIs:
- `networking.k8s.io/v1` is the GA NetworkPolicy API; `podSelector: {}`, `policyTypes`, `ingress`/`egress` peers, `ipBlock`/`except`, and combined `namespaceSelector` + `podSelector` peers (AND semantics) are all used correctly.
- The DNS egress policy correctly combines `namespaceSelector` (kube-system) and `podSelector` (`k8s-app: kube-dns`) within a single `to` peer, and opens both UDP and TCP port 53.
- The `kubernetes.io/metadata.name` label used in namespace selectors is the correct auto-applied namespace label (GA since Kubernetes 1.21).
- Cilium examples use the correct `cilium.io/v2` / `CiliumNetworkPolicy` kind, `endpointSelector`, `fromEndpoints`, L7 `http` rules, and `toFQDNs`/`matchName` syntax.
- `kubectl run server --image=nginx --port=80 --expose` is valid — `--expose` creates an associated ClusterIP service and requires `--port`.
- The CNI support claims are accurate: Calico and Cilium fully support NetworkPolicies, and Flannel does not enforce them (policies are silently ignored).

## Review Notes
- **Weave Net (line 37):** The "Full support" claim is historically accurate — Weave Net enforced NetworkPolicies via its network policy controller. However, Weaveworks ceased operations in 2024 and Weave Net is no longer actively maintained, so readers should treat it as a legacy option. This is a maintenance/lifecycle caveat, not a technical error.
- **Pattern 3 (Prometheus scrape, lines 304-308):** The ingress allows ports 9090 and 8080. 9090 is Prometheus's own server port rather than a typical scrape-target port; in practice the allowed port should match whatever metrics port the scraped workloads expose. The manifest is syntactically valid and the AND-combined namespace+pod selector is correct — this is a minor conceptual note, not an error.
- **Pattern 4 (line 328):** The comment says "Allow Stripe API" but the rule actually allows egress to all external (non-RFC1918) addresses on port 443. The behavior is correct and clearly documented inline; the comment is just aspirational labeling.
- **`kubectl neat` (line 470):** This is a third-party kubectl plugin and must be installed separately (e.g., via krew); the post presents it as such.
