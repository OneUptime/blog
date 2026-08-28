# Validation Summary: How to Move an ESXi Management VMkernel Adapter to a Standard Switch

## Status
validated

## Post Type
Technical guide / operational runbook

## Technologies Covered

- VMware vSphere ESXi 7.x and 8.x
- VMware vCenter Server
- vSphere Distributed Switch (vDS)
- vSphere Standard Switch (vSS)
- VMkernel networking and management services
- VLANs, MTU, NIC teaming, LACP, and physical uplinks
- vSphere HA, network rollback, DCUI, ESXCLI, and `vmkping`

## Sources Consulted

- [Broadcom KB 306406: Migrate Virtual Machines and VMkernel Adapters from vDS to vSS](https://knowledge.broadcom.com/external/article/306406/migrate-virtual-machines-vms-and-vmkerne.html)
- [Broadcom ESXCLI network command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html)
- [Broadcom KB 326175: Configure or restore vSS and vDS networking from the ESXi command line](https://knowledge.broadcom.com/external/article/326175/configuring-standard-vswitch-vss-or-virt.html)
- [Broadcom KB 386467: Recover ESXi host connectivity when management is on a DVS](https://knowledge.broadcom.com/external/article/386467)
- [Broadcom KB 315423: Test network connectivity with ping and vmkping](https://knowledge.broadcom.com/external/article/315423/testing-network-connectivity-with-the-pi.html)
- [Broadcom KB 344313: Test VMkernel connectivity with vmkping](https://knowledge.broadcom.com/external/article?legacyId=1003728)
- [Broadcom KB 311145: Understand network rollback and recovery in vSphere 7.0 and later](https://knowledge.broadcom.com/external/article?legacyId=2032908)
- [Broadcom KB 415012: Network rollback after a management-network change](https://knowledge.broadcom.com/external/article/415012)
- [Broadcom KB 377465: Automatic network rollback protection for vmk0](https://knowledge.broadcom.com/external/article/377465)
- [Create a vSphere Standard Switch](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-networking/setting-up-networking-with-vnetwork-standard-switches/create-a-vsphere-standard-switch.html)
- [LACP support on a vSphere Distributed Switch](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-networking/configuring-lacp-on-a-vsphere-distrubuted-switch-in-the-vsphere-web-client.html)
- [vSphere HA networking best practices](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/8-0/vsphere-availability/creating-and-using-vsphere-ha-clusters/best-practices-for-vsphere-ha-clusters/best-practices-for-networking.html)
- [Broadcom KB 432849: Validate ESXi DNS A and PTR records](https://knowledge.broadcom.com/external/article/432849/error-cannot-contact-host-when-trying.html)
- [Broadcom KB 415405: End of General Support for vSphere 7.0](https://knowledge.broadcom.com/external/article/415405/end-of-general-support-for-vsphere)

## Issues Found

- The command and verification examples were IPv4-specific, but the post did not state that limitation. Added an explicit IPv4 management-network scope statement so IPv6 users do not treat the IPv4 address, route, and `vmkping` examples as complete instructions.
- The post stated that a successful ping was necessary. ICMP can be filtered while vCenter management traffic still works, so the wording now describes ping as useful but insufficient where ICMP is permitted.
- The HA guidance only said to check that cluster agents recovered. Added the official maintenance sequence: suspend Host Monitoring before the management-network change, reconfigure vSphere HA afterward so it refreshes management-network information, verify agent health, and re-enable Host Monitoring.
- The rollback section did not distinguish `vmk0` from another management-tagged VMkernel adapter. Added Broadcom's documented limitation that automatic network rollback protects only `vmk0`.
- The post told readers to follow the linked CLI migration KB exactly. Broadcom KB 376245 currently contains an apparent gateway-command typo (`esxcfg-vswitch -a default` instead of `esxcfg-route -a default`), so that source was replaced with the purpose-built recovery KB 386467 and the wording now directs readers to the applicable recovery procedure.
- The version section did not mention that vSphere 7.0 is outside General Support. Added its October 2, 2025 End of General Support date and updated the Standard Switch and LACP documentation links from the vSphere 7.0 pages to the equivalent vSphere 8.0 pages.

## Review Notes

- All displayed commands are syntactically valid for the stated IPv4 scope. Broadcom still documents `esxcfg-vswitch -l`; the `esxcli` address and route commands and `vmkping -I` syntax are also current for ESXi 7.x and 8.x.
- The staged migration sequence matches Broadcom KB 306406: retain one working vDS uplink, move a second uplink to the vSS, migrate the existing management VMkernel adapter, verify connectivity, and move other consumers only when required.
- VLAN `0` correctly means that ESXi sends untagged traffic for that port group. The MTU, VLAN, security-policy, teaming, out-of-band access, and destructive DCUI recovery warnings are accurate.
- A vSS does not support dynamic LACP. Static EtherChannel with Route based on IP hash is a distinct supported design with matching upstream requirements and remains outside this guide's stated LAG scope.
- The vSphere Client action is documented as both **Migrate VMkernel Adapter** and **Migrate VMkernel Adapters** in current Broadcom material; the post already warns that labels vary by version.
