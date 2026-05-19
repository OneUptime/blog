# Validation Summary: How to Install and Configure Open vSwitch on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Open vSwitch
- Netplan
- OVS command-line tools (`ovs-vsctl`, `ovs-ofctl`, `ovs-appctl`, `ovs-dpctl`, `ovsdb-client`)
- Linux networking and network namespaces
- DPDK

## Sources Consulted
- Open vSwitch documentation: Distributions packaging Open vSwitch - https://docs.openvswitch.org/en/latest/intro/install/distributions/
- Open vSwitch FAQ: Basic Configuration - https://docs.openvswitch.org/en/stable/faq/configuration/
- Open vSwitch `ovs-vsctl(8)` man page - https://www.openvswitch.org/support/dist-docs/ovs-vsctl.8.html
- Open vSwitch `ovs-ofctl(8)` man page - https://www.openvswitch.org/support/dist-docs/ovs-ofctl.8.html
- Open vSwitch `ovsdb-client(1)` man page - https://www.openvswitch.org/support/dist-docs/ovsdb-client.1.html
- Open vSwitch `ovs-vswitchd.conf.db(5)` man page - https://www.openvswitch.org/support/dist-docs/ovs-vswitchd.conf.db.5.html
- Open vSwitch Networking Namespaces on Linux - https://docs.openvswitch.org/en/latest/topics/networking-namespaces/
- Ubuntu Server documentation: How to use Open vSwitch with DPDK - https://ubuntu.com/server/docs/how-to/networking/dpdk-with-open-vswitch/
- Ubuntu man page: `netplan(5)` for Ubuntu 22.04 - https://manpages.ubuntu.com/manpages/jammy/man5/netplan.5.html
- Netplan YAML reference - https://netplan.readthedocs.io/en/latest/netplan-yaml/

## Issues Found
- The Netplan examples used `renderer: openvswitch`, but Netplan's documented renderers are the normal backends such as `networkd` or `NetworkManager`; OVS devices are selected through the `openvswitch:` mapping. Changed the examples to `renderer: networkd` while keeping `openvswitch: {}` on the bridges.
- The post said the persistent Netplan OVS example applied to Ubuntu 18.04+. Netplan documents OVS support as `openvswitch` mapping support since version 0.100, so the wording was corrected to Netplan 0.100+ / Ubuntu 20.04 updates and newer releases.
- The internal-port section described the ports as useful for VMs and then mixed host IP assignment with namespace assignment on the same interface. Updated the section to describe host or namespace use, noted that VM tap interfaces should be added as OVS ports, and changed the namespace example to use a separate internal port and IP address.
- A comment said `other-config:hwaddr` set a human-readable switch name. It actually sets the bridge local interface MAC address, so the comment was corrected.

## Review Notes
The remaining OVS package names, common `ovs-vsctl` bridge and port commands, OpenFlow inspection commands, OVSDB backup/restore commands, and troubleshooting commands matched the official documentation or Ubuntu packaging references. DPDK installation is package-correct, but real DPDK use still requires additional host setup and OVS configuration beyond installing the package.
