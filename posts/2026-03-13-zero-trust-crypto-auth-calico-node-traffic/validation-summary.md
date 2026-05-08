# Validation Summary: Zero Trust with Crypto Authentication for Calico Node Traffic

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- FelixConfiguration
- WireGuard
- calicoctl
- kubectl

## Sources Consulted
- Calico Open Source documentation: Encrypt in-cluster pod traffic - https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico Open Source documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Configuring Felix - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico Open Source documentation: Node resource - https://docs.tigera.io/calico/latest/reference/resources/node
- Kubernetes documentation: kubectl debug - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes nodes with kubectl - https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The post claimed that `wireguardEnabled` protects the BGP control plane and all inter-node communication. Calico documents this setting primarily for inter-node pod traffic; host-to-host traffic uses `wireguardHostEncryptionEnabled` and has platform-specific support. I narrowed the claims to inter-node pod data plane encryption and added a note to review host-encryption support separately.
- The FelixConfiguration example used `wireguardInterfaceMTU`, which is not the documented field name. I changed it to `wireguardMTU`.
- The verification command checked a Kubernetes Node annotation for the WireGuard public key. Calico Open Source documentation verifies this through `calicoctl get node <NODE-NAME> -o yaml` and the `status.wireguardPublicKey` field, so I updated the command.
- The `wg show` example used the wrong default interface name, `calico.wireguard`. Current Calico documentation lists the default IPv4 WireGuard interface as `wireguard.cali`, so I updated the command.
- The node debugging `tcpdump` example did not request a debug profile with network capabilities. I added `--profile=netadmin` and made the capture filter explicitly UDP port 51820.
- The Mermaid diagram used a nonstandard dotted cross-edge syntax. I changed it to Mermaid's documented cross-edge syntax.

## Review Notes
The Calico node namespace can be `calico-system` for operator installs or `kube-system` for some manifest installs. The examples now use `calico-system`; readers should substitute the namespace and pod name used by their installation.
