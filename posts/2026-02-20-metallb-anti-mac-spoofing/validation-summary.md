# Validation Summary: How to Fix Anti-MAC Spoofing Blocking MetalLB L2 Traffic

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes
- MetalLB Layer 2 mode
- ARP and NDP
- VMware ESXi / vSphere
- Microsoft Hyper-V
- Proxmox VE
- Open vSwitch
- KVM / libvirt
- AWS, GCP, Azure, and OpenStack networking

## Sources Consulted
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB troubleshooting documentation: https://metallb.io/troubleshooting/index.html
- MetalLB release notes for current Kubernetes labels: https://metallb.io/release-notes/
- Microsoft Set-VMNetworkAdapter documentation: https://learn.microsoft.com/en-us/powershell/module/hyper-v/set-vmnetworkadapter
- Microsoft Hyper-V virtual switch MAC spoofing documentation: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/jj679878(v=ws.11)
- Proxmox VE Firewall documentation: https://pve.proxmox.com/pve-docs/chapter-pve-firewall.html
- Proxmox VE qm.conf documentation: https://pve.proxmox.com/wiki/Manual%3A_qm.conf
- Open vSwitch ovs-vswitchd.conf.db manual: https://www.openvswitch.org/support/dist-docs/ovs-vswitchd.conf.db.5.html
- libvirt Domain XML documentation: https://www.libvirt.org/formatdomain.html
- OpenStackClient port command documentation: https://docs.openstack.org/python-openstackclient/queens/cli/command-objects/port.html
- Google Cloud VPC documentation: https://cloud.google.com/vpc/docs/vpc
- Azure Virtual Network FAQ: https://learn.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq
- AWS VPC User Guide: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html

## Issues Found
- The post incorrectly claimed that normal MetalLB L2 mode uses ARP replies from an unrecognized VIP MAC. MetalLB L2 answers ARP/NDP using the announcing node's MAC address. Updated the explanation, diagram text, flowchart, title, and conclusion to refer to virtualization port-security and anti-spoofing filters rather than treating MAC spoofing as the normal MetalLB mechanism.
- The MetalLB speaker log selector used the outdated `app=metallb-speaker` label. Updated it to the current `app=metallb,app.kubernetes.io/component=speaker` selector and clarified that `announcing from node` is visible through service events.
- The diagnosis section overstated that missing ARP replies definitively prove hypervisor drops. Updated it to list other plausible causes, including MetalLB advertisement issues, host firewall rules, and wrong Layer 2 placement.
- The Proxmox fix incorrectly put `macfilter=0` on the QEMU `net0` line. Proxmox documents `macfilter` as a firewall option, so the example now edits `/etc/pve/firewall/<VMID>.fw` and sets `macfilter: 0` under `[OPTIONS]`.
- The Open vSwitch example used an unsupported generic `other-config:mac-restriction=false` port option. Replaced it with inspection commands and guidance to adjust actual OVS/OpenFlow or Proxmox firewall rules.
- The libvirt example used `trustGuestRxFilters` as a child element on a bridge interface. libvirt documents it as an `interface` attribute, supported for virtio macvtap/direct connections, so the XML snippet was corrected.
- The OpenStack command used `--no-security-groups`; OpenStackClient documents the singular `--no-security-group`. Updated the command.
- The quick reference table implied VMware and Hyper-V MAC spoofing settings are always required. Updated it to state that those settings are relevant only when the VM sends non-vNIC source MACs or changes guest MAC behavior.

## Review Notes
The guide is now technically accurate as a port-security troubleshooting guide, but the directory slug still references anti-MAC spoofing. That is a naming artifact rather than a technical issue in the post content.
