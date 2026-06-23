# Validation Summary: How to Configure MetalLB for VLAN Networks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MetalLB
- Kubernetes Services and NetworkPolicies
- Kubernetes custom resources
- Helm
- Linux VLAN interfaces
- Netplan
- NetworkManager / nmcli
- Prometheus Operator ServiceMonitor

## Sources Consulted
- MetalLB installation documentation: https://metallb.universe.tf/installation/
- MetalLB configuration documentation: https://metallb.universe.tf/configuration/
- MetalLB advanced L2 configuration documentation: https://metallb.universe.tf/configuration/_advanced_l2_configuration/
- MetalLB advanced IPAddressPool configuration documentation: https://metallb.universe.tf/configuration/_advanced_ipaddresspool_configuration/
- MetalLB usage documentation: https://metallb.universe.tf/usage/
- MetalLB API reference: https://metallb.universe.tf/apis/
- MetalLB Helm chart values and templates: https://github.com/metallb/metallb/tree/main/charts/metallb
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Netplan VLAN documentation: https://canonical-netplan.readthedocs-hosted.com/en/latest/single-nic-vm-host-with-vlans/
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Red Hat nmcli VLAN documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-configure_802_1q_vlan_tagging_using_the_command_line_tool_nmcli

## Issues Found
- The Netplan example created interfaces named `vlan100`, `vlan200`, and `vlan300`, while later MetalLB examples targeted `ens192.100`, `ens192.200`, and `ens192.300`. Updated the Netplan VLAN keys to create the same interface names used by L2Advertisements.
- The Netplan and nmcli examples configured gateways on every VLAN, which can introduce unintended competing default routes. Removed those gateway settings from the per-VLAN interface setup.
- The `netplan try` comment incorrectly said it only checks syntax without making changes. Updated it to describe the temporary apply and rollback behavior.
- The Helm example used the stale/incorrect `speaker.memberlistSecretName` value. Removed it and added `frrk8s.enabled=false` so the example installs the native/L2-only deployment intentionally.
- Service examples used deprecated `metallb.universe.tf/*` annotations. Updated them to the current `metallb.io/*` annotation prefix.
- The specific IP examples used or suggested `spec.loadBalancerIP`, which Kubernetes deprecated in v1.24. Updated examples to use MetalLB's `metallb.io/loadBalancerIPs` annotation.
- Node selector labels used the old MetalLB domain as if it were an official label namespace. Replaced them with neutral example labels under `network.example.com/*`.
- The NetworkPolicy example claimed VLAN isolation more strongly than Kubernetes NetworkPolicy can guarantee and used a non-standard namespace label. Updated the comments and selector to use `kubernetes.io/metadata.name`.
- The traffic-flow diagram incorrectly showed the MetalLB speaker forwarding service traffic. Updated it to show the speaker answering ARP and the elected node/kube-proxy handling service forwarding.
- Troubleshooting log commands used old MetalLB pod labels. Updated selectors to current Helm chart labels.
- The node debugging example used a BusyBox image for `ip addr show`, which may not include the expected tooling. Updated it to use Ubuntu.
- The ConfigMap example was fenced as `bash` even though it was YAML. Updated the fence language to `yaml`.
- The ServiceMonitor selector used the old `app: metallb` label. Updated it to match the current `app.kubernetes.io/name: metallb` label.

## Review Notes
The guide is technically relevant and now aligns with the current MetalLB CRD model and Kubernetes Service deprecation guidance. In a future revision, it would be useful to add a short note that inter-VLAN routing and source IP preservation depend on the surrounding network, CNI, kube-proxy mode, and `externalTrafficPolicy` choices.
