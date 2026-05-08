# Validation Summary: Zero Trust Encrypted Pod Traffic with Calico WireGuard

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- Calico FelixConfiguration
- WireGuard
- kubectl
- calicoctl
- tcpdump

## Sources Consulted
- Calico documentation: Encrypt in-cluster pod traffic, https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configuring Felix, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: Network policy resource, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes documentation: kubectl debug, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes Nodes With Kubectl, https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post claimed all pod-to-pod or data-plane traffic is encrypted, including traffic on the same node. Calico documents that WireGuard encrypts inter-node pod traffic and does not encrypt same-node pod traffic, so the description, introduction, verification note, and conclusion were changed to use inter-node scope.
- The post said Calico encrypts traffic using "WireGuard or IPsec" while the guide only configures WireGuard. This was narrowed to WireGuard to match the documented configuration.
- The prerequisite wording said WireGuard requires Linux kernel 5.6+. Calico documents that WireGuard is included in Linux 5.6+ and backported to some earlier distribution kernels, so the wording was corrected.
- The FelixConfiguration patch used `wireguardInterfaceMTU`, which is not the documented Felix field. It was changed to `wireguardMTU`.
- The WireGuard verification command used Kubernetes Node YAML. Calico documents checking node WireGuard status with `calicoctl get node <NODE-NAME> -o yaml`, so the command was updated.
- The Calico NetworkPolicy egress rule had duplicate `destination` keys, which would make the YAML invalid or cause one mapping to override the other. The selector and port were combined under a single `destination`.
- The NetworkPolicy rules with destination ports omitted explicit protocols. TCP was added for the HTTPS and database examples to match the intended ports and Calico examples.
- The node packet capture example used `busybox` for `tcpdump`. Kubernetes documents that debug images may not include troubleshooting tools, so the example was changed to a network troubleshooting image and `--profile=netadmin`.

## Review Notes
The `kubectl exec` examples still use placeholder Calico node pod names and should be adapted to the actual `calico-node` pod running on the target node. The guide is accurate for IPv4 WireGuard encryption as shown; IPv6 requires `wireguardEnabledV6`.
