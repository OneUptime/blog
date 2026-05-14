# Validation Summary: Common Mistakes to Avoid with Calico Encrypted Pod Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- FelixConfiguration
- WireGuard
- Linux networking

## Sources Consulted
- Calico documentation: Encrypt in-cluster pod traffic - https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: Network policy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Configure MTU to maximize network performance - https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Kubernetes documentation: kubectl debug - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The introduction claimed encrypted pod traffic prevents interception even by other processes on the same node and that Calico encrypts all data-plane traffic. Calico WireGuard encrypts inter-node traffic on the host-to-host part of the path; same-node pod traffic and pod-to-local-host traffic are not encrypted. Updated the wording to match Calico's documented scope.
- The description, verification comment, and conclusion implied all inter-pod traffic would be encrypted. Updated those statements to refer specifically to inter-node traffic and WireGuard frames.
- The prerequisites said WireGuard requires Linux kernel 5.6+. WireGuard is included in Linux 5.6+ but has been backported to some earlier distribution kernels. Updated the prerequisite wording.
- The FelixConfiguration example used `wireguardInterfaceMTU`, which is not the documented Felix field. Replaced it with `wireguardMTU`.
- The Calico NetworkPolicy egress rule had duplicate `destination` keys, which would drop the selector in normal YAML parsing. Combined the selector and port under one `destination` block.
- The NetworkPolicy rules that match TCP service ports omitted `protocol: TCP`. Added `protocol: TCP` for the payment-service ingress and payment-db egress rules to align with Calico examples and validation expectations for port-specific rules.

## Review Notes
The verification examples assume the Calico node container includes `wg` and that the selected debug image includes `tcpdump`; in practice operators may need to choose the actual calico-node pod name and a debugging image with packet-capture tools installed.
