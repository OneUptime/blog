# Validation Summary: Configure Calico VPP Technical Details

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered
- Calico VPP dataplane
- Kubernetes
- FD.io VPP
- DPDK
- VPP startup configuration
- Calico VPP ConfigMap configuration

## Sources Consulted
- Calico Open Source documentation: VPP primary interface configuration, https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico Open Source documentation: VPP data plane implementation details, https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico Open Source documentation: VPP getting started and ConfigMap schema, https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP source: `config/config.go`, https://github.com/projectcalico/vpp-dataplane/blob/v3.31.0/config/config.go
- Calico VPP services troubleshooting documentation, https://github.com/projectcalico/vpp-dataplane/blob/v3.31.0/docs/services/troubleshooting.md
- Calico VPP tun/tap pod interface implementation, https://github.com/projectcalico/vpp-dataplane/blob/v3.31.0/calico-vpp-agent/cni/podinterface/tuntap.go
- FD.io VPP startup configuration reference, https://docs.fd.io/vpp/25.06/configuration/reference.html
- FD.io VPP packet processing graph documentation, https://docs.fd.io/vpp/22.10/aboutvpp/extensible.html
- FD.io VPP DPDK startup parser source, https://github.com/FDio/vpp/blob/stable/2506/src/plugins/dpdk/device/init.c

## Issues Found
- The introduction described the VPP processing graph as a directed acyclic graph and implied Calico VPP adds graph nodes for IPAM. I changed this to a directed graph and described the Calico VPP components and plugins more accurately.
- The Mermaid graph used a non-verified `calico-policy-forward` node and skipped the CNAT service feature. I changed the diagram to identify Calico policy and CNAT as feature-arc processing instead of inventing a specific node name.
- The buffer configuration comments mixed byte-depth sizing with VPP's `buffers-per-numa` count. I changed the comments to match the VPP startup configuration reference and used the documented example value.
- The CPU configuration mixed manual pinning (`main-core` and `corelist-workers`) with the automatic-pinning `skip-cores` option. I removed `skip-cores` from the manual pinning example.
- The ConfigMap sample used invalid Calico VPP JSON field names: `newDriverName`, `numRxQueues`, `numTxQueues`, `tapRxQueueSize`, and `tapTxQueueSize`. I corrected these to the documented JSON fields: `newDriver`, `rx`, `tx`, `rxqsz`, and `txqsz`.
- The ConfigMap sample included `wireguardEnabled` under `CALICOVPP_FEATURE_GATES`, but that is not a current field in the Calico VPP feature gates schema. I removed it and used documented feature gate fields.
- The pod interface section said each pod gets a tap interface and showed a `vpp0` Linux name. Calico VPP creates a VPP tapv2 interface configured as tun by default, with the Linux-side name coming from the pod CNI interface, typically `eth0`. I updated the text and sample output.
- The service load-balancing commands used `show nat44`, but Calico VPP services are implemented and debugged through the VPP CNAT plugin. I changed the commands to `show cnat translation` and `show cnat session verbose`.

## Review Notes
The DPDK and CPU startup snippets use valid VPP startup configuration keys. Exact queue counts, descriptors, buffer counts, and CPU pinning should still be tuned per NIC, NUMA layout, VPP version, and worker count.
