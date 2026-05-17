# Validation Summary: How to Configure Network Policies for Security in Talos Linux

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- Talos Linux
- Kubernetes NetworkPolicy (networking.k8s.io/v1)
- Cilium (CNI) and Cilium CLI
- Calico, Flannel (mentioned as alternative/non-supporting CNIs)
- CoreDNS / kube-dns
- Hubble (Cilium observability)
- KubeSpan (Talos WireGuard mesh)
- ingress-nginx
- Prometheus (monitoring scrape policy example)
- kubectl, bash, jq (for audit script)

## Sources Consulted
- Kubernetes NetworkPolicies docs: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Talos Cilium deployment guide: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Talos KubeSpan docs: https://www.talos.dev/v1.6/talos-guides/network/kubespan/
- Cilium CLI repo: https://github.com/cilium/cilium-cli
- Cilium v1.16.0 release notes: https://github.com/cilium/cilium/releases/tag/v1.16.0
- Flannel README: https://github.com/flannel-io/flannel
- CoreDNS deployment manifest: https://github.com/coredns/deployment/blob/master/kubernetes/coredns.yaml.sed
- ingress-nginx Helm chart helpers.tpl: https://github.com/kubernetes/ingress-nginx/blob/main/charts/ingress-nginx/templates/_helpers.tpl
- Kubernetes namespaces docs (kubernetes.io/metadata.name label): https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/

## Issues Found
No technical issues found.

All technical claims were verified against official documentation:
- Flannel is the default CNI in Talos and does not enforce NetworkPolicies (correct).
- Cilium CLI install steps (download URL, tarball binary name `cilium`, `cilium install --version 1.16.0`) are accurate. Cilium 1.16.0 was released 2024-07-24.
- Talos machine config YAML (`cluster.network.cni.name: none` plus `cluster.inlineManifests` as a sibling of `cluster.network`) matches the official Sidero docs.
- NetworkPolicy semantics described are correct: empty `podSelector: {}` selects all pods; `policyTypes: [Egress]` with `egress: []` denies all egress for selected pods; policies are additive (union of allow rules) so the separate `allow-dns` policy still permits DNS for the database pod.
- `k8s-app: kube-dns` is the correct label selector for CoreDNS pods.
- `app.kubernetes.io/name: ingress-nginx` is the correct standard label set by the ingress-nginx Helm chart.
- `kubernetes.io/metadata.name` is the auto-applied namespace label that holds the namespace name.
- KubeSpan uses UDP port 51820 (WireGuard default).
- ipBlock with `cidr: 0.0.0.0/0` and `except` carving out RFC1918 ranges is a valid pattern for "external-only" egress.
- The bash audit script logic (jsonpath + jq counting empty-podSelector policies) is sound.

## Review Notes
- The `kubernetes.io/metadata.name` label went beta in Kubernetes 1.21 and GA in 1.22, but the post does not assert a specific version, so no edit is needed.
- The Cilium CLI download URL uses the `/latest/download/` GitHub alias rather than a pinned version — convenient but not reproducible. Acceptable for a tutorial.
- The `wget --timeout=3` flag in the testing section relies on BusyBox wget accepting the GNU-style long option; on most current Alpine images this works, but `-T 3` would be a more portable alternative. Minor, not worth changing.
- The Cilium inline-manifest YAML stub is a placeholder rather than a runnable example; the post correctly signals this with a comment.
- Database policy declares `egress: []` while listing `policyTypes: [Egress]`. Functionally equivalent to omitting `egress`, but the explicit form better signals intent — fine as-is.
