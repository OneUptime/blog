# Validation Summary: Common Mistakes to Avoid with Crypto Authentication for Calico Node Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- FelixConfiguration
- WireGuard
- BGP
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Encrypt in-cluster pod traffic, https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configuring Felix, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes documentation: kubectl debug, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl, https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post claimed that enabling WireGuard protects the BGP control plane and all inter-node communication. Calico's documented `wireguardEnabled` setting encrypts inter-node pod traffic; host-network traffic such as BGP requires the separate `wireguardHostEncryptionEnabled` setting and has support caveats. Updated the introduction, architecture diagram, and conclusion to distinguish pod traffic encryption from host-network/control-plane encryption.
- The prerequisites said Linux kernel 5.6+ was required on all nodes. WireGuard is included in Linux 5.6+ but can be backported or installed on earlier kernels. Updated the prerequisite to require Linux 5.6+ or WireGuard installed on participating nodes.
- The FelixConfiguration example used `wireguardInterfaceMTU`, which is not the documented FelixConfiguration resource field. Changed it to `wireguardMTU`.
- The verification command checked a Kubernetes node annotation for `projectcalico.org/WireguardPublicKey`, but the Calico documentation verifies WireGuard status through Calico node status fields such as `status.wireguardPublicKey`. Replaced the command with `calicoctl get node <NODE-NAME> -o yaml`.
- The peer verification command used `calico.wireguard` as the interface name. Calico's default IPv4 WireGuard interface name is `wireguard.cali`. Updated the command accordingly.
- The tcpdump command filtered only by port. Updated it to filter UDP port 51820, matching WireGuard's UDP transport and Calico's default IPv4 listening port.

## Review Notes
The examples assume Calico node pods are in `kube-system`, which is common for manifest installs but not universal; operator installations may use a different namespace such as `calico-system`. The post now avoids claiming host-network encryption is enabled by default, but future revisions could add install-mode-specific notes if the guide is expanded.
