# Validation Summary: How to Debug Encrypted Pod Traffic in Calico When Connectivity Fails

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- Calico FelixConfiguration
- WireGuard
- kubectl
- Mermaid

## Sources Consulted
- Calico documentation: Encrypt in-cluster pod traffic - https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configuring Felix - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: NetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: System requirements and WireGuard ports - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Kubernetes documentation: kubectl debug reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Mermaid documentation: Flowchart syntax - https://mermaid.ai/open-source/syntax/flowchart.html

## Issues Found
- The introduction and description claimed Calico encrypts all pod-to-pod traffic and protects against same-node interception. Calico WireGuard encrypts inter-node pod traffic on the wire, while same-node pod traffic is not encrypted by this feature. Updated the wording to describe inter-node pod traffic accurately.
- The prerequisite stated WireGuard requires Linux kernel 5.6+. WireGuard is included in Linux 5.6+ and has been backported to some earlier Linux kernels. Updated the wording to match Calico documentation.
- The FelixConfiguration patch used `wireguardInterfaceMTU`, which is not the documented Felix WireGuard MTU key. Changed it to `wireguardMTU`.
- The verification command used `grep wireguard`, but Calico node annotations use `Wireguard` capitalization. Changed it to `grep -i wireguard`.
- The Calico NetworkPolicy example had duplicate `destination` keys in one egress rule, which would cause the selector to be overwritten or rejected depending on the YAML parser. Merged `selector` and `ports` under a single `destination`.
- The packet capture example used `busybox`, which commonly lacks `tcpdump`, and did not request a network-capable debug profile. Changed it to use `nicolaka/netshoot` with `--profile=netadmin`.
- The Mermaid diagram used fragile multiline labels and an invalid-looking dotted cross edge. Replaced node line breaks with `<br/>` and used a standard dotted arrow.
- The conclusion claimed encryption for all pod-to-pod traffic. Updated it to say inter-node pod traffic.

## Review Notes
The post now accurately describes Calico WireGuard encryption scope. Future improvements could mention IPv6 enablement with `wireguardEnabledV6`, host-network encryption caveats on EKS/AKS, and that MTU values should be chosen based on the cluster's physical network MTU.
