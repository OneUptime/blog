# Validation Summary: How to Monitor Crypto Authentication for Calico Node Traffic

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
- kubectl

## Sources Consulted
- Calico Open Source: Encrypt in-cluster pod traffic: https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico Open Source: Felix configuration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source: Configuring Felix: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source: Node resource: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico Open Source: Kubernetes requirements and network ports: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The introduction and conclusion claimed that enabling WireGuard protects both BGP control-plane traffic and pod data-plane traffic generally. Calico documentation says `wireguardEnabled` enables inter-node pod traffic encryption, while host-network traffic such as BGP requires `wireguardHostEncryptionEnabled` and has documented platform/deployment caveats. I narrowed the wording to pod traffic and supported host-network encryption.
- The FelixConfiguration snippet used `wireguardInterfaceMTU`, which is not the documented Felix setting. I changed it to `wireguardMTU`.
- The prerequisite stated Linux kernel 5.6+ as a hard requirement. Calico documents that WireGuard is included in Linux 5.6+ and backported to some earlier distribution kernels. I updated the prerequisite to allow backported and installed WireGuard support.
- The verification command used Kubernetes node annotations as the main check. Current Calico Open Source documentation verifies WireGuard status through the Calico Node resource status with `calicoctl get node <NODE-NAME> -o yaml`. I updated the command accordingly.
- The peer check used `calico.wireguard` as the WireGuard interface. Calico documents the default IPv4 interface name as `wireguard.cali`. I corrected the command.

## Review Notes
- The `kubectl debug node/node1 -it --image=nicolaka/netshoot -- tcpdump ...` pattern matches Kubernetes node debugging syntax, but packet capture requires sufficient privileges in the debug container and may need profile adjustments depending on cluster policy.
- The examples assume Calico node pods are in `kube-system`; operator-based installations may use a different namespace such as `calico-system`.
