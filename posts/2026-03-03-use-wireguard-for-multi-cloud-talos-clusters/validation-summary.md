# Validation Summary: How to Use WireGuard for Multi-Cloud Talos Clusters

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Talos Linux machine configuration
- WireGuard
- AWS EC2 security groups and Elastic IPs
- Google Cloud VPC firewall rules
- Azure Network Security Groups
- Cilium Cluster Mesh and native routing
- Prometheus Operator alerting rules

## Sources Consulted
- Talos Linux WireGuard network documentation: https://docs.siderolabs.com/talos/v1.11/networking/wireguard-network
- Talos Linux machine configuration reference: https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos Linux configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos Linux CLI reference for `talosctl patch` and `talosctl debug`: https://docs.siderolabs.com/talos/v1.13/reference/cli
- WireGuard protocol documentation: https://www.wireguard.com/protocol/
- AWS CLI `authorize-security-group-ingress` reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- Google Cloud `gcloud compute firewall-rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- Azure CLI `az network nsg rule create` reference: https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule
- Cilium Cluster Mesh setup documentation: https://docs.cilium.io/en/latest/network/clustermesh/clustermesh/
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- prometheus_wireguard_exporter documentation: https://mindflavor.github.io/prometheus_wireguard_exporter/

## Issues Found
- Talos WireGuard peer configuration used `persistentKeepalive`, which is not the Talos machine config field. Changed it to `persistentKeepaliveInterval: 25s`, matching the Talos configuration reference.
- Talos patch commands used `--patch-file`, which is not the current `talosctl patch machineconfig` flag. Changed the examples to use `--patch @file`.
- The non-gateway Talos routes were placed at `machine.network.routes`, but Talos v1alpha1 static routes belong under a network interface. Moved them under `machine.network.interfaces[].routes` and used `eth0` as the example primary interface.
- The Azure NSG example used lowercase enum values and singular address/port flags. Updated it to the documented Azure CLI values and plural flags: `Udp`, `Inbound`, `Allow`, `--source-address-prefixes`, and `--destination-port-ranges`.
- The Cilium native-routing example did not set a native routing CIDR covering all pod CIDRs. Added `ipv4NativeRoutingCIDR: 10.244.0.0/16`, which covers the example pod CIDR ranges.
- The performance section used `talosctl ping`, which is not a current Talos command. Replaced it with a Talos debug-container workflow and `ping` from inside the debug shell.
- The post claimed a specific WireGuard latency overhead of 0.1-0.5 ms per packet without a stable official basis. Reworded it to describe the overhead as hardware- and workload-dependent and to recommend measuring both paths.
- The Prometheus alert used `wireguard_latest_handshake_seconds` without explaining that the metric depends on an exporter. Updated the text to mention `prometheus_wireguard_exporter` and changed the expression to `wireguard_latest_handshake_delay_seconds > 300`, matching that exporter's latest-handshake delay metric.

## Review Notes
The architecture remains a high-level example. In production, readers still need to adapt interface names, cloud routing tables, firewall source ranges, Cilium service exposure, MTU, and high-availability failover automation to their specific cloud networks and Talos/Cilium versions.
