# Validation Summary: How to Troubleshoot Talos Linux Nodes Not Joining the Cluster

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Kubernetes
- etcd
- Linux networking
- TLS certificates and NTP

## Sources Consulted
- Sidero Labs Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Sidero Labs Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Sidero Labs Talos network configuration overview: https://docs.siderolabs.com/talos/v1.12/networking/configuration/overview
- Sidero Labs Talos dynamic addressing documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/dynamic
- Sidero Labs Talos static addressing documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/static
- Sidero Labs Talos physical links documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/physical
- Sidero Labs Talos network connectivity documentation: https://docs.siderolabs.com/talos/v1.10/learn-more/talos-network-connectivity
- Sidero Labs Talos logging documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/logging-and-telemetry/logging
- Sidero Labs Talos time servers documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/time

## Issues Found
- The networking check comment claimed `talosctl get addresses` tested reachability to the control plane. It only displays address status, so the comment was changed to say it checks assigned addresses.
- The network configuration example used the older `machine.network.interfaces` shape with `routes[].network`. Current Talos networking documentation shows `DHCPv4Config` and `LinkConfig` documents with `routes[].gateway`, so the example was updated.
- The service listing command used `talosctl services`, but the current CLI reference uses the singular `talosctl service`. The command was corrected.
- The certificate guidance only mentioned `cluster.secret` and `cluster.ca`. Talos node trust also depends on the machine token and machine CA from the generated configuration set, so that clarification was added.
- The reset command expected the node to reboot but omitted `--reboot`. The command was updated to include `--reboot`.
- The reset warning said only the ephemeral partition would be wiped. The current CLI defaults to wipe mode `all`, so the warning was corrected.

## Review Notes
The guide remains intentionally version-neutral. The Talos docs reviewed were the current Sidero Labs documentation available during validation, with network configuration cross-checked against the newer configuration document model.
