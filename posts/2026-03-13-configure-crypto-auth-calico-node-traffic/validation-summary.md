# Validation Summary: How to Configure Crypto Authentication for Calico Node Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- FelixConfiguration
- WireGuard
- BGP session security
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Encrypt in-cluster pod traffic - https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Felix configuration parameters - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: Secure BGP sessions - https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- Kubernetes documentation: kubectl exec reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post claimed WireGuard protects the BGP control plane. Calico WireGuard documentation describes encryption for inter-node pod traffic and, in specific supported environments, inter-node host-network traffic. Calico documents BGP session protection separately with BGP passwords and explicitly notes that password use does not encrypt BGP data exchange. I changed the BGP/control-plane claims to describe BGP security as separate from WireGuard pod traffic encryption.
- The FelixConfiguration example used `wireguardInterfaceMTU`, which is not the documented Felix setting. I changed it to `wireguardMTU`, the documented IPv4 WireGuard MTU field.
- The verification command checked a Kubernetes node annotation named `projectcalico.org/WireguardPublicKey`. Calico documents WireGuard public key verification through Calico node status using `calicoctl get node <NODE-NAME> -o yaml`. I updated the command accordingly.
- The WireGuard interface command used `calico.wireguard`, but Calico's documented default IPv4 WireGuard interface name is `wireguard.cali`. I updated the command to use `wireguard.cali`.
- The conclusion said WireGuard encrypts all inter-node communication. I narrowed this to supported inter-node traffic and noted that host-to-host encryption requires `wireguardHostEncryptionEnabled` only in supported scenarios.

## Review Notes
- The post remains a concise guide rather than a complete Calico WireGuard hardening reference. Future improvements could add separate IPv6 coverage with `wireguardEnabledV6` and clarify namespace differences for `calico-node` pods, which may run in `kube-system` or `calico-system` depending on installation method.
