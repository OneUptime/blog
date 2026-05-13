# Validation Summary: How to Configure Encrypted Pod Traffic in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico FelixConfiguration
- Calico NetworkPolicy
- WireGuard
- kubectl
- calicoctl
- tcpdump

## Sources Consulted
- Calico documentation: Encrypt in-cluster pod traffic - https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Felix configuration parameters - https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: NetworkPolicy resource - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Node resource - https://docs.tigera.io/calico/latest/reference/resources/node
- Calico documentation: Kubernetes system requirements and WireGuard ports - https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico documentation: IPsec configuration with VPP - https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/ipsec

## Issues Found
- The introduction claimed Calico encrypted pod-to-pod traffic even from other processes on the same node. Official Calico documentation says WireGuard encrypts the host-to-host portion of inter-node traffic and does not encrypt same-node pod traffic, so I narrowed the wording to inter-node, host-to-host protection.
- The introduction referred to WireGuard or IPsec as if both were part of the same general Calico encrypted pod traffic workflow. Calico's IPsec documentation applies to the VPP data plane and has separate prerequisites, so I kept this guide focused on WireGuard.
- The FelixConfiguration example used `wireguardInterfaceMTU`, which is not the documented FelixConfiguration field. I changed it to `wireguardMTU`.
- The verification command used `kubectl get node` to look for WireGuard status. Calico documents WireGuard public key status on Calico Node resources, so I changed the example to `calicoctl get node <node-name> -o yaml | grep wireguardPublicKey`.
- The Calico NetworkPolicy egress rule had duplicate `destination` keys, which would overwrite one another in YAML parsing. I merged the selector and port into a single `destination` block and added explicit `protocol: TCP` values for the TCP service port rules.
- The tcpdump verification example used a BusyBox debug image, which typically does not include tcpdump. I changed it to `nicolaka/netshoot` and made the port filter explicitly UDP for the default IPv4 WireGuard port 51820.
- The Mermaid diagram used literal newlines inside node labels, which is fragile Mermaid syntax. I changed the labels to use `<br/>`.
- The conclusion claimed encryption for all pod-to-pod traffic. I changed it to inter-node pod traffic to match Calico's documented support.

## Review Notes
The example uses placeholders for the Calico namespace and calico-node pod because Calico may run in `kube-system` or `calico-system` depending on the installation method. Calico also supports IPv6 WireGuard through `wireguardEnabledV6` and default UDP port 51821, but this post focuses on IPv4 WireGuard.
