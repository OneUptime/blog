# Validation Summary: How to Set Up KubeSpan Mesh Networking in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- KubeSpan
- WireGuard
- Kubernetes
- Talos Discovery Service
- `talosctl`
- YAML machine configuration

## Sources Consulted
- Talos KubeSpan documentation: https://docs.siderolabs.com/talos/v1.12/networking/kubespan
- Talos Discovery Service documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/discovery
- Talos machine configuration reference for KubeSpan fields: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- WireGuard protocol/cryptography documentation: https://www.wireguard.com/protocol/

## Issues Found
- The post said KubeSpan routes pod and service traffic through tunnels by default. Updated this to explain that KubeSpan handles node-to-node traffic by default, while pod-to-pod traffic is normally handled by the CNI unless Kubernetes network advertisement is explicitly enabled.
- The new-cluster setup used only a config patch. Updated the primary command to use the official `talosctl gen config --with-kubespan` flag and added discovery to the patch-file example.
- The existing-cluster patch enabled only `machine.network.kubespan`. Updated the example to also ensure `cluster.discovery.enabled` is true, because KubeSpan requires discovery.
- The discovery example enabled the Kubernetes registry and described it as a normal external-service-free option. Updated it to show `kubernetes.disabled: true` and noted that the Kubernetes registry is disabled by default and deprecated with Kubernetes 1.32+ authorization changes.
- The advanced KubeSpan options showed `harvestExtraEndpoints: true` as an example default and omitted current documented options. Changed it to `false`, added `mtu` and endpoint filters, and documented the performance caveat for larger meshes.
- The `advertiseKubernetesNetworks` section recommended enabling the option generally. Updated it to reflect the documented default and CNI compatibility caveats for Calico and Cilium.
- The firewall section implied KubeSpan could generally use other ports and that NAT traversal is automatic. Updated it to state that KubeSpan uses UDP 51820 and that restrictive firewall/NAT cases may still require inbound UDP 51820 on one side.
- The verification section used `kubespanidentity`; updated it to the documented `kubespanidentities` resource.
- The performance section referenced AES-NI for WireGuard overhead. Updated it to refer to WireGuard's ChaCha20-Poly1305-based cryptography instead.

## Review Notes
- The post is now technically aligned with current Talos documentation as of 2026-05-16.
- `talosctl` was not installed in the local environment, so CLI verification was performed against the official Talos CLI reference rather than local `--help` output.
