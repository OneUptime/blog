# Validation Summary: How to Validate Crypto Authentication for Calico Node Traffic Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- FelixConfiguration
- WireGuard
- calicoctl
- kubectl debug

## Sources Consulted
- Calico documentation: Encrypt in-cluster pod traffic - https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Node resource - https://docs.tigera.io/calico/latest/reference/resources/node
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: kubectl debug - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes Nodes With Kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post claimed WireGuard protects the BGP control plane and all inter-node communication. Calico documentation describes WireGuard encryption primarily for inter-node pod traffic, with host-network traffic support limited to EKS and AKS clusters using cloud provider CNI instead of Calico CNI. I narrowed the claims to inter-node pod traffic encryption.
- The FelixConfiguration example used `wireguardInterfaceMTU`, which is not the documented Felix WireGuard MTU setting. I changed it to `wireguardMTU`.
- The Kubernetes node annotation command used `projectcalico.org/WireguardPublicKey`, but Calico documents verification through the Calico Node resource status fields, such as `wireguardPublicKey`. I changed the verification command to `calicoctl get node <NODE-NAME> -o yaml`.
- The `wg show` command referenced `calico.wireguard`, but Calico's default IPv4 WireGuard interface name is `wireguard.cali`. I updated the command to use `wireguard.cali`.
- The architecture diagram described BGP routes as encrypted control-plane traffic. I removed that claim and kept the diagram focused on encrypted inter-node pod traffic.

## Review Notes
The `kubectl debug node/node1 -it --image=nicolaka/netshoot -- tcpdump -i eth0 -n port 51820 -c 10` command is consistent with Kubernetes node debugging syntax and Calico's default IPv4 WireGuard UDP port. In some clusters, node debugging may require elevated permissions or a debug profile such as `--profile=sysadmin`, depending on the cluster's security policy.
