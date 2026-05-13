# Validation Summary: How to Migrate to Crypto Authentication for Calico Node Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- FelixConfiguration
- WireGuard
- BGP
- kubectl
- calicoctl

## Sources Consulted
- Calico documentation: Encrypt in-cluster pod traffic - https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Secure BGP sessions - https://docs.tigera.io/calico/latest/network-policy/comms/secure-bgp
- WireGuard quick start and wg command reference - https://www.wireguard.com/quickstart/
- Mermaid documentation: Flowchart syntax - https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- The post claimed Calico WireGuard protects the BGP control plane. Calico documents WireGuard primarily for inter-node pod traffic, with host-network traffic only in specific supported environments, while BGP session protection is documented separately with BGP passwords. I changed the control-plane claims to data-plane pod traffic and noted that BGP routes should be secured separately.
- The FelixConfiguration example used `wireguardInterfaceMTU`, which is not the documented FelixConfiguration field. I changed it to `wireguardMTU`.
- The verification command checked a Kubernetes node annotation. Calico's current verification documentation shows checking the Calico node status with `calicoctl get node <NODE-NAME> -o yaml`, so I updated the command.
- The WireGuard interface name in the peer verification command was `calico.wireguard`, but Calico's documented default IPv4 WireGuard interface name is `wireguard.cali`. I updated the command.
- The Mermaid diagram used an undocumented `-.-x` connector. I changed it to the documented dotted arrow syntax `-.->`.

## Review Notes
The guide now accurately describes WireGuard encryption for inter-node pod traffic. Host-network traffic encryption can be enabled with `wireguardHostEncryptionEnabled` only for the supported cases documented by Calico, so it was not added as a general instruction.
