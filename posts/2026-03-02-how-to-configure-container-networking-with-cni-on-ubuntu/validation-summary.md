# Validation Summary: How to Configure Container Networking with CNI on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Container Network Interface (CNI)
- CNI reference plugins
- cnitool
- Podman networking
- Linux network namespaces
- containerd
- Kubernetes CNI configuration
- iptables

## Sources Consulted
- CNI Specification: https://www.cni.dev/docs/spec/
- CNI cnitool documentation: https://www.cni.dev/docs/cnitool/
- CNI plugins overview: https://github.com/containernetworking/plugins
- CNI bridge plugin documentation: https://www.cni.dev/plugins/current/main/bridge/
- CNI host-local IPAM documentation: https://www.cni.dev/plugins/current/ipam/host-local/
- CNI static IPAM documentation: https://www.cni.dev/plugins/current/ipam/static/
- Podman network documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-network.1.html
- Podman command documentation for network configuration directories: https://docs.podman.io/en/v4.3/markdown/podman.1.html
- Kubernetes network plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- containerd CRI configuration documentation: https://github.com/containerd/containerd/blob/main/docs/cri/config.md
- Ubuntu package metadata for containernetworking-plugins and podman via apt-cache

## Issues Found
- The post description claimed VXLAN overlay configuration, but the article does not include a VXLAN example. Changed the description to reference the bridge, MACVLAN, and IPVLAN examples actually covered.
- The Ubuntu package install path was listed as `/opt/cni/bin/`. Ubuntu packages install CNI plugins under `/usr/lib/cni/`; `/opt/cni/bin/` is appropriate for the upstream tarball install path. Updated the apt-based path and added CNI_PATH notes for both install methods.
- The cnitool section included a non-existent GitHub release URL for a pre-built `cni-tools-linux-amd64.tgz` archive. Removed that download path and kept the supported `go install` method.
- The Podman section implied current Podman uses CNI by default and always writes CNI config under `~/.config/cni/net.d/`. Current Podman defaults to Netavark, with CNI deprecated. Updated the text to instruct readers to check `podman info --format '{{.Host.NetworkBackend}}'` before expecting CNI config files.
- The containerd debugging snippet used an incorrect TOML section, `[plugins."io.containerd.grpc.v1.cni"]`. Replaced it with containerd's documented debug configuration section.

## Review Notes
The CNI configuration examples use `cniVersion` 0.4.0, which remains compatible with Kubernetes' minimum CNI requirement, although current CNI documentation now describes newer spec versions. The MACVLAN and IPVLAN examples assume the host interface is named `eth0`; users on Ubuntu systems with predictable interface names may need to substitute the actual interface name.
