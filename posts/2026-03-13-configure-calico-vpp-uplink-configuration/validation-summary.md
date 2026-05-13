# Validation Summary: Configure Calico VPP Uplink Configuration

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes ConfigMaps and kubectl
- VPP uplink drivers
- DPDK and vfio-pci
- Linux PCI and network interface discovery

## Sources Consulted
- Calico VPP primary interface configuration: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico VPP getting started and `CALICOVPP_INTERFACES` specification: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP config package / `UplinkInterfaceSpec` JSON tags: https://pkg.go.dev/github.com/projectcalico/vpp-dataplane/v3/config
- DPDK `dpdk-devbind` tool documentation: https://doc.dpdk.org/guides/tools/devbind.html

## Issues Found
- The post described SR-IOV Virtual Functions as a direct Calico VPP uplink mode, but the current documented `vppDriver` values include drivers such as `af_packet`, `dpdk`, `virtio`, `avf`, `vmxnet3`, `rdma`, `af_xdp`, and `none`. Updated the wording to reference native VPP uplink modes and `avf` for supported Intel 700-Series and 800-Series interfaces.
- The introduction implied that every uplink is taken over from Linux using DPDK. Updated it to say that VPP drives the uplink using the configured VPP driver, which also covers `af_packet`, `virtio`, and other supported modes.
- The DPDK examples used incorrect JSON keys: `newDriverName`, `numRxQueues`, `numTxQueues`, `rxQueueSize`, and `txQueueSize`. Updated them to the documented serialized keys: `newDriver`, `rx`, `tx`, `rxqsz`, and `txqsz`.
- The virtio example used `numRxQueues`, which is not a documented `CALICOVPP_INTERFACES` key. Updated it to `rx` and added the matching `tx` queue count.
- The multiple-uplink example included a `bondInterfaces` object with `mode` and `loadBalance`, but this is not part of the documented `CALICOVPP_INTERFACES` schema. Removed the unsupported bonding object and kept the supported multiple `uplinkInterfaces` list.
- The DPDK flow diagram said `dpdk-devbind` performs the binding during VPP startup. Calico VPP's manager handles interface setup from `CALICOVPP_INTERFACES`, so the diagram now says `vpp-manager` binds the interface to `vfio-pci`.
- The prerequisite list mentioned `uio_pci_generic` as a DPDK kernel module. The current Calico VPP documentation calls out hugepages and `vfio-pci` for native drivers and DPDK setup, so the prerequisite was narrowed to `vfio-pci`.

## Review Notes
- The `dpdk-devbind.py --status-dev net` command is valid for inspecting DPDK network device status.
- The post does not pin a Calico VPP version. The corrections were made against the current Calico documentation and the published `github.com/projectcalico/vpp-dataplane/v3/config` package as of this review.
