# Validation Summary: Test IPv6 Control Plane with Calico

## Status
validated

## Post Type
Tutorial / Guide (operational validation playbook)

## Technologies Covered
- Calico (v3.23+) — Felix, BIRD/BIRD6, BGP, IPAM, network policy
- Kubernetes (IPv6-only and dual-stack clusters)
- `calicoctl` CLI
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- CoreDNS (AAAA record resolution)
- BIRD 1.x (`birdc6` client)
- `kubectl`, `dig`, `curl`, `jq`

## Sources Consulted
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico BGPPeer reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico IP autodetection docs: https://docs.tigera.io/calico/latest/networking/ipam/ip-autodetection
- Calico WireGuard reference (`wireguardEnabledV6`): https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico GitHub issue confirming `birdc6` client: https://github.com/projectcalico/calico/issues/2458
- Kubernetes JSONPath support reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes JSONPath regex tracking issue: https://github.com/kubernetes/kubernetes/issues/72220
- Kubernetes NetworkPolicy v1 API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#networkpolicy-v1-networking-k8s-io

## Issues Found

1. **Invalid FelixConfiguration field `ipv6AutodetectionMethod`** — The original Felix configuration snippet declared `ipv6AutodetectionMethod: "first-found"` under `FelixConfiguration.spec`. This field does not exist in the `projectcalico.org/v3` FelixConfiguration CRD. IPv6 autodetection is configured either via the `IP6_AUTODETECTION_METHOD` environment variable on the `calico-node` DaemonSet, or via `Installation.spec.calicoNetwork.nodeAddressAutodetectionV6` on operator-based installs. Removed the invalid field and added a short note pointing readers to the correct location for that setting.

2. **kubectl JSONPath regex `=~` is not supported** — The original snippet used `kubectl get pod ... -o jsonpath='{.status.podIPs[?(@.ip=~"::")].ip}'`. The kubectl JSONPath implementation supports only `==` (and `!=`) in filter expressions; the `=~` regex operator produces an "unrecognized character in action: U+007E '~'" error. Replaced the expression with a `range`-based JSONPath that prints every `podIPs[*].ip` on its own line, then pipes through `grep ':' | head -1` to select the IPv6 address.

## Review Notes
- The `calico-system` namespace used for `kubectl exec ... -l k8s-app=calico-node ...` is correct for Tigera-operator-based installs. Manifest-based ("calico.yaml") installs place `calico-node` in `kube-system` instead — readers using that install path will need to adjust the namespace.
- `birdc6` is correct for Calico's current BIRD 1.x integration. If Calico ever ships a BIRD 2.x-based image, the single `birdc` client would replace it; this is worth re-checking on future Calico major upgrades.
- The `Calico v3.23+` prerequisite is consistent with `wireguardEnabledV6` availability (introduced in v3.23). Dual-stack pod networking and IPv6 BGP have been supported for several releases prior, so the floor is set by the WireGuard-v6 example rather than by the IPv6 control-plane features themselves.
- The NetworkPolicy uses standard `networking.k8s.io/v1` semantics; Calico applies the same selector to both IPv4 and IPv6 endpoints, so the post's claim that the policy covers both address families is accurate.
- `2001:db8:1::1` is a documentation-range address per RFC 3849, appropriate for an example.
