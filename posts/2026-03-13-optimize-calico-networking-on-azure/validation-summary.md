# Validation Summary: Optimize Calico Networking on Azure

## Status
validated

## Post Type
Tutorial / Guide (performance optimization)

## Technologies Covered
- Calico (Project Calico, CNI)
- Kubernetes
- Microsoft Azure (Virtual Machines, VNets, Route Tables, Accelerated Networking / SR-IOV)
- Azure CLI (`az`)
- VXLAN encapsulation
- eBPF dataplane
- MTU / jumbo frames

## Sources Consulted
- Calico documentation — IPPool resource (projectcalico.org/v3): https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation — MTU configuration: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation — eBPF dataplane: https://docs.tigera.io/calico/latest/operations/ebpf/
- Calico Operator Installation reference (`spec.calicoNetwork.linuxDataplane`): https://docs.tigera.io/calico/latest/reference/installation/api
- Azure documentation — Accelerated Networking (SR-IOV) overview: https://learn.microsoft.com/azure/virtual-network/accelerated-networking-overview
- Azure CLI reference — `az network nic update`: https://learn.microsoft.com/cli/azure/network/nic
- Azure CLI reference — `az network route-table route create` (valid `--next-hop-type` values incl. `VirtualAppliance` paired with `--next-hop-ip-address`): https://learn.microsoft.com/cli/azure/network/route-table/route
- Azure CLI reference — `az vm deallocate` / `az vm start` / `az vm show`: https://learn.microsoft.com/cli/azure/vm
- Azure VM sizes — Dsv5 / Ddsv5 / Fsv2 series network bandwidth tables: https://learn.microsoft.com/azure/virtual-machines/sizes

## Issues Found
- **MTU example contradiction (Optimization 3)**: The bash snippet's comment read "Without VXLAN (native routing): set MTU to 1500 or jumbo frame size", but the `kubectl patch` command immediately below set `mtu: 1450` (which is the correct value for VXLAN with a 1500-byte host MTU, not for native routing). Updated the example to set `mtu: 1500` so it matches the "Without VXLAN" comment and is consistent with Calico's documented guidance (native routing = host MTU; VXLAN = host MTU − 50). The VXLAN-specific guidance for 1450 / 8950 already appears in the comments below the command.

## Review Notes
- The Calico IPPool spec uses the correct `projectcalico.org/v3` API and valid fields (`cidr`, `ipipMode: Never`, `vxlanMode: Never`, `natOutgoing`, `blockSize`).
- `az network route-table route create --next-hop-type VirtualAppliance --next-hop-ip-address <node-ip>` is the correct CLI invocation; note (not added to the post since it didn't claim completeness) that Azure also requires IP forwarding to be enabled on the target NIC (`az network nic update --ip-forwarding true`) for the node to act as a virtual appliance for pod CIDR traffic.
- The 50-byte VXLAN overhead figure matches Calico's documented MTU guidance.
- The Tigera operator path `spec.calicoNetwork.linuxDataplane: BPF` is valid (`BPF`, `Iptables`, `Nftables`, `VPP` are accepted values). The Ubuntu 22.04 / kernel 5.15+ requirement listed is conservative — Calico's eBPF dataplane officially supports kernel 5.3+ — but stating a stricter, well-tested baseline is reasonable and not technically wrong.
- Azure VM bandwidth figures (D8s_v5 up to 12.5 Gbps, F16s_v2 up to 12.5 Gbps, D32ds_v5 up to 16 Gbps) align with Microsoft's published "max bandwidth" numbers; in practice the "expected" sustained bandwidth is lower. The phrasing "Up to ..." matches Microsoft's own terminology.
- The Accelerated Networking impact claims ("up to 70% latency reduction", "up to 30x throughput") are roughly consistent with Microsoft's marketing/benchmark statements for SR-IOV vs. software-path NICs; treat as upper bounds rather than typical values.
