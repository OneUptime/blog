# Validation Summary: How to Implement Networking Best Practices in Rancher

## Status
validated

## Post Type
Tutorial / Best-practices guide

## Technologies Covered
- Rancher / Kubernetes (CNI selection)
- Calico (Tigera operator: `operator.tigera.io/v1` Installation)
- Flannel, Cilium, Canal CNIs
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- NGINX Ingress Controller (annotations, TLS, rate limiting, security headers)
- CoreDNS (Corefile tuning, cache, forward plugin)
- Linkerd (service mesh, mTLS, viz extension)
- Istio (mentioned)
- MetalLB (`metallb.io/v1beta1` IPAddressPool, L2Advertisement)
- VXLAN / BGP networking, ports (8472, 179, 2379-2380)

## Sources Consulted
- ingress-nginx annotations (rate-limiting): https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Linkerd install docs: https://linkerd.io/2-edge/tasks/install/
- MetalLB configuration: https://metallb.universe.tf/configuration/
- Tigera/Calico Installation API: https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- CoreDNS plugins: https://coredns.io/plugins/

## Issues Found

1. **Invalid NGINX Ingress rate-limit annotations.** The post used `nginx.ingress.kubernetes.io/rate-limit: "100"` and `nginx.ingress.kubernetes.io/rate-limit-window: "1m"`, which do not exist in the ingress-nginx controller. The supported annotations are `limit-rps`, `limit-rpm`, `limit-connections`, `limit-burst-multiplier`, `limit-rate`, `limit-rate-after`, and `limit-allowlist`. Replaced both annotations with the single correct annotation `nginx.ingress.kubernetes.io/limit-rpm: "100"` (the time window is implicit in rpm vs. rps).

2. **Missing Linkerd CRDs install step.** Since Linkerd 2.12 (Sept 2022), the install procedure requires applying CRDs first via `linkerd install --crds | kubectl apply -f -`, then the control plane via `linkerd install | kubectl apply -f -`. Running only the second command on a fresh cluster fails. Added the missing `--crds` step before the existing `linkerd install` line.

3. **Misleading CoreDNS comment about ndots.** The Corefile contained the comment `# Increase ndots for service discovery efficiency` immediately above the `loop`/`reload`/`loadbalance` plugins, which are unrelated to ndots. ndots is configured in the pod's resolv.conf (via Pod `dnsConfig` or kubelet flags), not in the Corefile. Removed the misleading comment so the example is not technically inaccurate.

## Review Notes
- The Calico `Installation` example uses `encapsulation: VXLAN` and `natOutgoing: Enabled`, both valid values for the Tigera operator API.
- The default-deny + DNS-allow NetworkPolicy pair is correct, and the use of the `kubernetes.io/metadata.name` namespace label (auto-applied since Kubernetes 1.22) for selecting `kube-system` is the right approach.
- MetalLB API versions are current: `metallb.io/v1beta1` for `IPAddressPool` and `L2Advertisement` (note: `BGPPeer` uses `v1beta2` if the user later expands the example).
- The Cilium kernel requirement (≥ 4.19) is the documented minimum, though many advanced eBPF features benefit from kernel 5.4+.
- The firewall port list (VXLAN/8472, BGP/179, etcd/2379-2380) is correct.
- `linkerd viz tap namespace/production` is valid syntax for the Linkerd Viz extension; users will need to run `linkerd viz install | kubectl apply -f -` separately to use it (out of scope for this post).
