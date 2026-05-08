# Validation Summary: Validate Calico VPP Uplink Configuration

## Status
validated

## Post Type
Tutorial / validation guide

## Technologies Covered
- Calico VPP dataplane
- Kubernetes and kubectl
- VPP CLI
- DPDK
- Linux NIC driver binding
- iperf3

## Sources Consulted
- Calico documentation: Primary interface configuration, https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico documentation: VPP data plane troubleshooting, https://docs.tigera.io/calico/latest/operations/troubleshoot/vpp
- VPP CLI reference: Basic interface commands, https://s3-docs.fd.io/vpp/25.10/cli-reference/interface/basic.html
- VPP CLI reference: Interface commands, https://docs.fd.io/vpp/18.01/clicmd_src_vnet.html
- VPP CLI reference: DPDK commands, https://docs.fd.io/vpp/25.10/cli-reference/clis/clicmd_src_plugins_dpdk_device.html
- Ubuntu Server documentation: About DPDK / dpdk-devbind.py usage, https://ubuntu.com/server/docs/explanation/networking/about-dpdk/
- Kubernetes kubectl reference: kubectl run and exec, https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- iPerf3 user documentation, https://iperf.fr/iperf-doc.php

## Issues Found
- The DPDK binding step stated that a NIC still bound to a Linux driver means VPP is using `af_packet` mode. Calico VPP also supports other non-DPDK drivers, so this was changed to say VPP is not using DPDK for that NIC.
- The VPP hardware-interface expected output mixed `show interface` MTU-style fields with `show hardware-interfaces` output. The example was corrected to show hardware-interface fields and queue/descriptor details.
- The queue validation step used `show dpdk version` to check RX queues. VPP documents `show hardware-interfaces` as the command that displays queue and descriptor allocation, so the command was changed.
- The queue-to-worker mapping step used `show dpdk statistics | grep -E "queue|worker"`. Current VPP interface documentation uses `show interface rx-placement` for interface queue worker placement, so the command was corrected.
- The error-counter step used `show dpdk statistics`, which is not present in the current VPP DPDK CLI reference. It was changed to `show hardware-interfaces <interface> detail`, and `rx_no_bufs` was updated to the DPDK extended statistic name `rx_mbuf_allocation_errors`.

## Review Notes
The exact VPP uplink interface name varies by driver and hardware, so `GigabitEthernet0/0/0` remains an example placeholder. The throughput target of approximately line rate is environment-dependent and may require CPU, MTU, offload, NUMA, and iperf stream tuning.
