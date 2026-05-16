# Validation Summary: How to Understand machined and Talos Components

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Talos Linux
- machined
- apid
- trustd
- containerd
- etcd
- kubelet
- Talos machine configuration
- Talos controller runtime and resources
- talosctl CLI

## Sources Consulted
- Talos Components documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/components
- Talos Architecture documentation: https://docs.siderolabs.com/talos/v1.13/learn-more/architecture
- Talos Boot Loader documentation: https://docs.siderolabs.com/talos/v1.10/platform-specific-installations/bare-metal-platforms/
- Talos Acquiring Machine Configuration documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/acquire
- Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Control Plane documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/control-plane/
- Talos Controllers and Resources documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/controllers-resources
- Talos Networking Resources documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/networking-resources
- Talos Network Connectivity documentation: https://docs.siderolabs.com/talos/v1.12/learn-more/talos-network-connectivity

## Issues Found
- The bootloader description was too generic for current Talos releases. Updated it to state that GRUB is used for legacy BIOS and systemd-boot with UKIs is used for new UEFI installations.
- The root filesystem section incorrectly described finding a SquashFS image on the boot partition and using overlay mounts for writable directories. Updated it to match Talos' documented read-only SquashFS root, tmpfs runtime mounts, and EPHEMERAL volume mounted at `/var`.
- The machine configuration source list used an imprecise "configuration partition" and mentioned DHCP-discovered configuration. Updated it to documented sources: STATE partition, platform metadata or `talos.config`, direct kernel argument configuration, and embedded configuration.
- The `talosctl get machineconfig -o yaml` example omitted the documented resource ID. Changed it to `talosctl -n 10.0.0.11 get machineconfig v1alpha1 -o yaml`.
- The trustd section incorrectly described trustd as primarily signing worker node CSRs. Updated it to describe Talos root-of-trust responsibilities and clarified that kubelet Kubernetes client certificates come through the Kubernetes bootstrap flow.
- The kubelet configuration inspection command used `talosctl get kubeletconfig`, which is not documented in the current CLI/resource examples. Changed it to inspect the machine configuration resource.
- The kubelet image example used an old Kubernetes image tag. Updated it to the current example tag from Talos documentation.
- The service startup sequence implied kubelet simply joins after apid and etcd. Updated it to mention that after etcd bootstrap Talos renders Kubernetes control plane static pods and kubelet starts them.
- The debugging advice for node join issues overemphasized trustd. Updated it to point at kubelet logs, the Kubernetes control plane, and apid connectivity.

## Review Notes
The `talosctl` binary was not installed locally, so CLI checks were validated against the official Talos CLI reference rather than local `--help` output.
