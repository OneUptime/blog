# Validation Summary: How to Debug Crypto Authentication for Calico Node Traffic

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- FelixConfiguration
- WireGuard
- kubectl
- calicoctl
- tcpdump

## Sources Consulted
- Calico documentation: Encrypt in-cluster pod traffic: https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configure encryption and authentication to secure Calico components: https://docs.tigera.io/calico/latest/network-policy/comms/crypto-auth
- Calico documentation: Configure BGP peering: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Kubernetes documentation: kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes Nodes With Kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post claimed that enabling Calico WireGuard protects the BGP control plane and all inter-node communication. Calico documents WireGuard primarily for inter-node pod traffic; host-network traffic encryption is a separate capability with platform limits. I changed the wording to focus on inter-node pod traffic and describe host-network encryption as supported only where Calico documents it.
- The FelixConfiguration example used `wireguardInterfaceMTU`, which is not the documented Felix option. I changed it to `wireguardMTU`.
- The verification command used the interface name `calico.wireguard`, but Calico's documented default IPv4 WireGuard interface name is `wireguard.cali`. I corrected the command.
- The `kubectl exec` examples did not specify the `calico-node` container, which can be ambiguous in multi-container pods. I added `-c calico-node`.
- The node debug tcpdump example omitted the command separator and a suitable debug profile for packet capture. I added `--profile=netadmin --` and made the tcpdump filter explicitly match UDP port 51820.

## Review Notes
- The `kubectl get node` annotation check is plausible for Kubernetes nodes using Calico, but the current Calico Open Source verification path also documents checking `status.wireguardPublicKey` via `calicoctl get node <NODE-NAME> -o yaml`.
- The post assumes the Calico node namespace is `kube-system`. Operator-based installations commonly use other namespaces, so readers may need to adjust the namespace in the commands.
