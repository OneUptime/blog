# Validation Summary: How to Roll Out Encrypted Pod Traffic in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- WireGuard
- Calico NetworkPolicy (projectcalico.org/v3)
- Felix configuration (`FelixConfiguration`)
- `kubectl`, `calicoctl`, `wg`, `tcpdump`
- Mermaid diagrams

## Sources Consulted
- Calico documentation - Enable WireGuard for Windows / Linux: https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- WireGuard official documentation: https://www.wireguard.com/quickstart/
- Linux kernel changelog (WireGuard merged in 5.6): https://lwn.net/Articles/810643/
- Kubernetes `kubectl debug` documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- nicolaka/netshoot image (commonly used for network debugging including tcpdump): https://github.com/nicolaka/netshoot

## Issues Found
1. **Duplicate `destination:` key in the egress NetworkPolicy rule (invalid YAML).** The egress rule for `payment-db` had two `destination:` keys back-to-back, which is invalid YAML (duplicate mapping keys). Merged them into a single `destination` block containing both `selector` and `ports`.
2. **Mermaid diagram contained literal newlines inside node labels.** Inside flowchart node brackets such as `A[Pod A\nNode 1]`, the post had actual newline characters which break Mermaid parsers. Replaced with single-line labels (`A[Pod A on Node 1]`, `C[Pod B on Node 2]`) so the diagram renders correctly. Also changed the `->` inside the bracket label `B[Node 1 -> Node 2]` to `B[Node 1 to Node 2]` to avoid characters that can confuse some Mermaid versions when used inside node text.
3. **`busybox` image used with `tcpdump` for `kubectl debug`.** The `busybox` image does not include `tcpdump`, so the example command would fail in practice. Replaced with `nicolaka/netshoot`, the standard image used for in-cluster network debugging and which ships with `tcpdump`.

## Review Notes
- The `wireguardEnabled` and `wireguardInterfaceMTU` fields on the `FelixConfiguration` resource are correct per the Calico reference docs. The MTU value of 1440 is a sensible default that accounts for the WireGuard header overhead on top of a standard 1500 MTU underlay.
- WireGuard for IPv4 has actually been GA in Calico since v3.15, with IPv6 support added in v3.21. The post's v3.26+ requirement is conservative but reasonable - readers will benefit from features added in newer releases. Left as-is.
- The placeholder pod names (`calico-node-xxx`, `calico-node-node1`) are clearly placeholders meant for the reader to substitute. Acceptable as illustrative.
- The default WireGuard listening port `51820` referenced in the `tcpdump` filter matches the Calico default (`wireguardListeningPort` in FelixConfiguration).
- `kubectl get node -o yaml | grep wireguard` will surface the `projectcalico.org/WireguardPublicKey` node annotation; case-sensitive `grep` works because that annotation contains lowercase `wireguard` substring inside `Wireguard`. (Ripgrep/grep default is case-sensitive but the substring `wireguard` is present.)
- The Calico NetworkPolicy itself only governs access control; encryption is enabled at the Felix/WireGuard layer. The post correctly conveys that the two work together (policy is evaluated, payload is encrypted in transit).
