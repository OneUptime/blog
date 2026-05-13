# Validation Summary: Optimize Calico Networking on IBM Cloud

## Status
validated

## Post Type
Tutorial / Optimization guide

## Technologies Covered
- Calico (CNI plugin, Felix, IPAM, eBPF dataplane)
- Kubernetes (kubectl, IKS — IBM Cloud Kubernetes Service)
- IBM Cloud VPC virtual server instances
- IBM Cloud Classic Infrastructure (bonded NICs)
- VXLAN overlay networking
- `ibmcloud` CLI, `calicoctl`

## Sources Consulted
- [Calico: Enabling eBPF dataplane](https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf) — kernel version requirements
- [Calico: FelixConfiguration reference](https://docs.tigera.io/calico/latest/reference/resources/felixconfig) — confirming MTU field names
- [Calico: Configuring MTU](https://docs.tigera.io/calico/latest/networking/configuring/mtu) — correct resource for MTU patch
- [IBM Cloud VPC instance profiles (vsi_is_profiles.md)](https://github.com/ibm-cloud-docs/vpc/blob/master/vsi_is_profiles.md) — instance bandwidth specs
- [About bandwidth allocation for instance profiles](https://cloud.ibm.com/docs/vpc?topic=vpc-bandwidth-allocation-profiles) — 2 Gbps/vCPU up to 80 Gbps cap

## Issues Found

1. **Incorrect bandwidth claim in introduction**
   - Original: "IBM Cloud VPC provides high-bandwidth instance profiles with up to 100 Gbps network performance."
   - Fix: IBM Cloud VPC virtual server instances are capped at 80 Gbps (2 Gbps per vCPU); higher bandwidth is only available on bare metal profiles. Updated the sentence to reflect this.

2. **Incorrect bandwidth values in profile table**
   - `cx2-16x32` was listed as 24 Gbps — actual value is 32 Gbps per IBM Cloud profile docs.
   - `mx2-32x256` was listed as 24 Gbps — actual value is 64 Gbps per IBM Cloud profile docs.
   - Corrected both rows in the table.

3. **Wrong kernel version for Calico eBPF dataplane**
   - Original: "For IKS workers running Ubuntu 20.04 or later (check kernel version ≥ 5.8)"
   - Per Calico docs, the eBPF dataplane requires Linux kernel **v5.10+** (or RHEL 8.4 with kernel 4.18.0-305+ via backports). Ubuntu 20.04 ships with 5.4 by default, which does not meet the requirement.
   - Updated to "Ubuntu 22.04 or later (check kernel version ≥ 5.10; RHEL 8.4+ with kernel 4.18.0-305+ also supported via backports)".

4. **Wrong resource targeted for MTU configuration**
   - Original used `kubectl patch felixconfiguration default --patch='{"spec":{"mtu":1450}}'`.
   - `FelixConfiguration` does not have a top-level `mtu` field — only overlay-specific fields like `vxlanMTU` and `ipipMTU`. The recommended way (and the one used by operator-installed Calico, which IKS deploys) is to patch the `Installation` resource at `spec.calicoNetwork.mtu`.
   - Replaced both commands to patch `installation default` with `spec.calicoNetwork.mtu`.

## Review Notes
- The Mermaid diagram cites "up to 60% throughput gain in benchmarks" for eBPF; published Tigera/Calico benchmarks do show meaningful improvements for certain workloads, but the exact percentage varies considerably by workload (service-mesh-like traffic, NodePort, large rule sets, etc.). The claim is plausible but worth qualifying in future revisions.
- The `ibmcloud is instance-profiles --output json` example pipes `.bandwidth` into `jq`. The `bandwidth` field in the API response is an object (e.g., `{type, value, default}`), so the output will be a JSON object rather than a scalar number. Not strictly wrong, just slightly unergonomic — `.bandwidth.value` would yield the integer.
- For manifest-based (non-operator) Calico installations, MTU is configured via the `calico-config` ConfigMap (`veth_mtu`) rather than the Installation resource. The post is targeted at IKS / operator-managed installs so this is fine, but readers running self-managed Calico without the operator should be aware.
- IKS does not always allow patching the Installation resource directly because IBM manages the Calico add-on. Some of these optimizations may require working through the IBM Cloud-managed configuration channels or are only fully applicable to self-managed clusters — the post does acknowledge this in the introduction.
