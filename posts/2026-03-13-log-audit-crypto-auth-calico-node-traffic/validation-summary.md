# Validation Summary: How to Log and Audit Crypto Authentication for Calico Node Traffic

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
- Calico documentation: Encrypt in-cluster pod traffic, https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico documentation: Felix configuration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Configuring Felix, https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico documentation: Node resource, https://docs.tigera.io/calico/latest/reference/resources/node
- Calico documentation: System requirements, https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements

## Issues Found
- The post claimed that enabling WireGuard protects the BGP control plane and all inter-node communication. Calico documentation describes `wireguardEnabled` as enabling encryption for inter-node pod traffic, while host-to-host traffic requires `wireguardHostEncryptionEnabled` and has deployment-specific support. I changed the affected introduction, architecture label, and conclusion to focus on inter-node pod traffic and optional supported host-to-host encryption.
- The prerequisites stated Linux kernel 5.6+ as a hard requirement. Calico documentation says WireGuard is included in Linux 5.6+ kernels but may be backported to earlier distribution kernels, and nodes without WireGuard installed do not participate in encryption. I changed this to require WireGuard to be installed or available in the kernel on participating nodes.
- The FelixConfiguration example used `wireguardInterfaceMTU`, which is not the documented FelixConfiguration field. I changed it to `wireguardMTU`.
- The verification command used `calico.wireguard` as the interface name. Calico documents `wireguard.cali` as the default IPv4 WireGuard interface name, so I changed the command to use `wireguard.cali`.

## Review Notes
The post now reflects Calico's documented WireGuard behavior for current Calico Open Source documentation. Future improvements could show `wireguardHostEncryptionEnabled` as a separate optional configuration block for supported EKS/AKS deployment modes, but that was not added to keep the post's structure unchanged.
