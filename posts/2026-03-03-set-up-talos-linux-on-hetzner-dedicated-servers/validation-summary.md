# Validation Summary: How to Set Up Talos Linux on Hetzner Dedicated Servers

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Talos Linux
- Hetzner dedicated servers and Robot networking
- Kubernetes
- Hetzner vSwitch VLAN networking
- Rancher Local Path Provisioner
- Rook/Ceph
- MetalLB
- Prometheus kube-prometheus-stack / node exporter
- Linux software RAID

## Sources Consulted
- Talos Linux v1.13 GitHub releases: https://github.com/siderolabs/talos/releases
- Talos Linux Image Factory / boot assets documentation: https://docs.siderolabs.com/talos/v1.12/platform-specific-installations/boot-assets
- Talos Linux machine configuration overview: https://docs.siderolabs.com/talos/v1.12/reference/
- Talos Linux LinkConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/linkconfig
- Talos Linux VLANConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/vlanconfig
- Talos Linux ResolverConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/resolverconfig
- Talos Linux HostnameConfig documentation: https://docs.siderolabs.com/talos/v1.12/networking/configuration/hostname
- Talos Linux configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Hetzner dedicated server Debian/Ubuntu network configuration documentation: https://docs.hetzner.com/robot/dedicated-server/network/net-config-debian-ubuntu/
- Hetzner additional IP address documentation: https://docs.hetzner.com/robot/dedicated-server/ip/additional-ip-adresses/
- MetalLB installation documentation: https://metallb.io/installation/
- Rancher Local Path Provisioner README: https://github.com/rancher/local-path-provisioner
- Rook/Ceph quickstart documentation: https://rook.io/docs/rook/latest-release/Getting-Started/quickstart/
- Prometheus community kube-prometheus-stack chart values: https://artifacthub.io/packages/helm/prometheus-community/kube-prometheus-stack

## Issues Found
- The Talos image download used `https://github.com/siderolabs/talos/releases/download/v1.7.0/metal-amd64.raw.xz`, which was outdated and not the current distribution path for the reviewed version. Updated it to the Talos Image Factory vanilla schematic URL for Talos v1.13.0, and verified the URL returns HTTP 200.
- The Talos network examples used the older `machine.network.interfaces` shape. Talos v1.12+ documents replace those fields with multi-document network resources such as `HostnameConfig`, `LinkConfig`, `ResolverConfig`, and `VLANConfig`. Updated the network and vSwitch snippets accordingly.
- The Hetzner /32 route example did not include the explicit host route to the gateway required by Hetzner's point-to-point IPv4 setup. Added a `/32` gateway host route before the default route.
- The vSwitch example used `vlanId`, but the current Talos field is `vlanID` in a `VLANConfig` document. Updated the field and document format.
- The Local Path Provisioner install command used the moving `master` branch. Updated it to the current stable `v0.0.35` manifest URL and verified the URL returns HTTP 200.
- The Rook install command applied only `operator.yaml` from the old `release-1.13` branch. Current Rook quickstart requires applying CRDs, common resources, the CSI operator, and the operator from a tagged release before creating a `CephCluster`. Updated the commands to `v1.19.2` manifests and verified all URLs return HTTP 200.
- The MetalLB install command used the moving `main` branch. Updated it to the official versioned `v0.15.3` manifest URL and verified the URL returns HTTP 200.
- The RAID section implied Talos could configure software RAID directly through `machine.disks`. Clarified that Talos can mount additional pre-created RAID devices, but `machine.disks` does not create a bootable software RAID array for the OS disk.
- The monitoring section described `/proc/mdstat` as a SMART health check. Corrected the text to describe it as Linux software RAID status instead.

## Review Notes
- `talosctl`, `kubectl`, and `helm` were not installed in the local workspace, so CLI command verification was performed against official documentation and upstream manifest URLs rather than local `--help` output.
- The post remains a high-level installation guide. Production deployments should still verify interface names, disk names, gateway IPs, extra IP routing behavior, and Rook/Ceph device selection on the actual Hetzner hardware before applying the examples.
