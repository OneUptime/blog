# Validation Summary: How to Use VIP with a Single Network Interface in Talos Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- Talos machine configuration
- Talos virtual shared IP (VIP)
- Layer 2 networking and gratuitous ARP
- Kubernetes API server
- Kubernetes NetworkPolicy
- Talos ingress firewall
- talosctl

## Sources Consulted
- Talos Linux Virtual (shared) IP documentation: https://docs.siderolabs.com/talos/v1.12/networking/advanced/vip
- Talos Linux Layer2VIPConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/layer2vipconfig
- Talos Linux LinkConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/linkconfig
- Talos Linux Static Addressing documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/static
- Talos Linux Ingress Firewall documentation: https://docs.siderolabs.com/talos/v1.12/networking/ingress-firewall/
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kube-apiserver reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/

## Issues Found
- The VIP examples used the older `machine.network.interfaces[].vip.ip` form. Updated the examples to current Talos network configuration documents using `Layer2VIPConfig`.
- The static address examples used older interface route/address fields. Updated them to `LinkConfig` with `addresses[].address` and `routes[].gateway`.
- The control plane apply commands reused the same `controlplane.yaml` for nodes with different static IPs and hostnames. Updated the commands to use node-specific config files.
- The DHCP example implied `dhcp: true` should be configured alongside VIP in the same interface block. Updated it to show DHCP as Talos' default for linked bare-metal interfaces and VIP as a separate `Layer2VIPConfig`.
- The Talos firewall example used an invalid `machine.network.nftablesRules` structure. Replaced it with current `NetworkDefaultActionConfig` and `NetworkRuleConfig` examples for Talos ingress firewall.
- The Kubernetes NetworkPolicy section implied pod policy could cover node-level services. Added a note that NetworkPolicies restrict pod traffic only when enforced by the CNI and do not replace Talos host firewall rules.
- The failover timing claim said failover is typically 3-12 seconds. Updated it to match Talos documentation: graceful shutdown is usually almost immediate, while unexpected failure can take up to about a minute.

## Review Notes
The post is technically relevant and accurate after the corrections. The examples assume Talos versions using the newer network configuration documents, and users on older Talos releases should check the matching versioned documentation before applying the snippets.
