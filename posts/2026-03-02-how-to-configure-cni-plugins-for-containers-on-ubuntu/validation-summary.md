# Validation Summary: How to Configure CNI Plugins for Containers on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Container Network Interface (CNI)
- CNI reference plugins
- containerd
- Kubernetes container networking
- Linux network namespaces
- Linux bridge, macvlan, ipvlan, and veth networking
- CNI IPAM plugins

## Sources Consulted
- CNI Specification: https://www.cni.dev/docs/spec/
- CNI cnitool documentation: https://www.cni.dev/docs/cnitool/
- CNI plugins repository: https://github.com/containernetworking/plugins
- CNI bridge plugin documentation: https://www.cni.dev/plugins/current/main/bridge/
- CNI macvlan plugin documentation: https://www.cni.dev/plugins/current/main/macvlan/
- CNI ipvlan plugin documentation: https://www.cni.dev/plugins/current/main/ipvlan/
- CNI ptp plugin documentation: https://www.cni.dev/plugins/current/main/ptp/
- CNI host-local IPAM documentation: https://www.cni.dev/plugins/current/ipam/host-local/
- CNI DHCP IPAM documentation: https://www.cni.dev/plugins/current/ipam/dhcp/
- CNI static IPAM documentation: https://www.cni.dev/plugins/current/ipam/static/
- CNI portmap plugin documentation: https://www.cni.dev/plugins/current/meta/portmap/
- containerd getting started documentation: https://containerd.io/docs/getting-started/
- containerd CRI configuration documentation: https://containerd.io/docs/2.1/cri/config/
- CNI plugins releases: https://github.com/containernetworking/plugins/releases

## Issues Found
- The post described CNI plugins as having only two categories and included IPAM under chained plugins. Updated this to the upstream grouping of main, IPAM, and meta plugins.
- The install example pinned CNI plugins v1.4.0, while the current upstream release is v1.9.1. Updated the version and expanded the example plugin list to include plugins present in current releases.
- The configuration ordering explanation said filenames determine the order plugins are applied. Clarified that many runtimes load config files lexicographically, while chained plugin execution order is controlled by the `plugins` array.
- The `hairpinMode` explanation said it allows a container to reach itself via the bridge IP. Updated it to match the bridge plugin behavior: enabling hairpin mode on bridge ports.
- The macvlan note suggested macvtap for host-to-container communication. Updated it to the more direct workaround of creating a host-side macvlan interface or using a separate interface.

## Review Notes
The remaining CNI JSON examples, IPAM options, `cnitool` commands, containerd paths, and Linux networking commands are consistent with the official CNI and containerd documentation. Some runtimes may require CNI configs to use a `.conflist` extension for chained plugin lists, but the JSON structure shown is valid and commonly accepted by CNI-aware runtimes.
