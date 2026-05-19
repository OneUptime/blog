# Validation Summary: How to Create Virtual Switches with OVS on Ubuntu

## Status
validated

## Post Type
Technical tutorial

## Technologies Covered
- Ubuntu
- Open vSwitch
- OVS bridges and ports
- KVM/libvirt networking
- VXLAN and GRE tunnels
- OVS patch ports
- OVS port mirroring
- VLAN access and trunk ports
- OVS ingress policing
- Linux network namespaces

## Sources Consulted
- Open vSwitch Basic Configuration FAQ: https://docs.openvswitch.org/en/stable/faq/configuration/
- Open vSwitch VXLAN FAQ: https://docs.openvswitch.org/en/latest/faq/vxlan/
- Open vSwitch with Libvirt: https://docs.openvswitch.org/en/latest/howto/libvirt/
- Open vSwitch VLAN FAQ: https://docs.openvswitch.org/en/latest/faq/vlan/
- Open vSwitch QoS Rate Limiting guide: https://docs.openvswitch.org/en/stable/howto/qos/
- Open vSwitch packet tracing documentation: https://docs.openvswitch.org/en/latest/topics/tracing/
- Open vSwitch networking namespaces documentation: https://docs.openvswitch.org/en/latest/topics/networking-namespaces/
- ovs-vsctl manual: https://www.openvswitch.org/support/dist-docs/ovs-vsctl.8.pdf
- ovs-vswitchd.conf.db manual: https://www.openvswitch.org/support/dist-docs/ovs-vswitchd.conf.db.5.pdf
- libvirt domain XML documentation: https://www.libvirt.org/formatdomain
- iproute2 local command help for `ip tuntap` and `ip link`

## Issues Found
- The patch port explanation said patch ports are useful for routing between network segments. Patch ports create an L2 connection between OVS bridges, not L3 routing, so the wording was changed to bridging traffic between OVS bridges.
- The VXLAN verification example used `ip link show vxlan-to-host2`. OVS tunnel interfaces are configured in OVSDB and are not necessarily visible as Linux netdevices with that name, so the check was changed to `sudo ovs-vsctl list interface vxlan-to-host2`.
- The port mirroring example referenced `vnet-monitor` before creating it. Added commands to create `vnet-monitor` as an OVS internal port and bring it up before configuring the mirror.
- The QoS example said it limits a VM's bandwidth to 100Mbps. OVS `ingress_policing_rate` limits traffic entering OVS from that interface, so the comment was corrected to describe traffic sent by the VM into OVS.

## Review Notes
The examples are command-oriented and assume the reader adapts interface names, IP addresses, and routing to their host. The physical NIC example is disruptive because moving an IP address from `eth0` to `br-public` can interrupt the current SSH session, but the OVS/IP command sequence itself is technically valid.
