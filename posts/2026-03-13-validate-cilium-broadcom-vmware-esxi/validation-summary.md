# Validation Summary: Validate Cilium on Broadcom VMware ESXi

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- VMware ESXi and vSphere networking
- VMware NSX
- eBPF
- VXLAN, Geneve, and native routing
- BGP

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Installation on Broadcom VMware ESXi / NSX: https://docs.cilium.io/en/stable/installation/k8s-install-broadcom-vmware-esxi-nsx/
- Cilium Routing Concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium CLI status command reference: https://docs.cilium.io/en/stable/cmdref/cilium_status/
- Cilium cilium-dbg map list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_map_list/
- Cilium Troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Broadcom VMware ESXi promiscuous mode configuration KB: https://knowledge.broadcom.com/external/article/324520
- VMware ESXCLI network command reference: https://vdc-download.vmware.com/vmwb-repository/dcr-public/26334f54-ee84-47c2-b2f3-901f51cbc98a/d3f55719-4d3f-47c4-a3c5-fe9c7e5a67f6/doc/esxcli_network.html

## Issues Found
- The prerequisite listed Linux kernel 4.19+ as sufficient. Current Cilium documentation lists Linux kernel 5.10+ or an equivalent distribution kernel, such as RHEL 8.10's 4.18 kernel, as the baseline for the Cilium container image. Updated the prerequisite accordingly.
- The eBPF map inspection command used `cilium bpf maps list`, which is not the current in-pod debug command. Updated it to `cilium-dbg map list`, matching Cilium's command reference.
- The introduction and vSwitch section implied that promiscuous mode and forged transmits are generally required for Cilium direct routing. Official Cilium VMware guidance focuses on tunnel protocol and VMXNET3 offload considerations, while VMware security policies are only required for specific MAC behavior or packet-capture designs. Updated the wording to make the dependency conditional.
- The best-practice note said native routing with BGP depends on vSwitch support. BGP routing depends on the upstream routed network and peers being able to route pod CIDRs, not on a vSwitch speaking BGP. Updated the note accordingly.

## Review Notes
The remaining commands are reasonable validation commands for a Kubernetes cluster running Cilium. For ESXi or NSX environments that use Cilium VXLAN encapsulation, Cilium's current VMware-specific documentation also recommends considering Geneve or a custom VXLAN tunnel port when troubleshooting inter-host pod communication issues.
