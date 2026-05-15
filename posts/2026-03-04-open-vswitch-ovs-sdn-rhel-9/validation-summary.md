# Validation Summary: How to Set Up Open vSwitch (OVS) for Software-Defined Networking on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Open vSwitch
- OVSDB and ovs-vsctl
- OpenFlow and ovs-ofctl
- VXLAN tunnel ports
- VLAN access and trunk ports
- NetworkManager OVS profiles with nmcli
- systemd service management

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing virtualization: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_managing_virtualization/Red_Hat_Enterprise_Linux-9-Configuring_and_managing_virtualization-en-US.pdf
- Red Hat Enterprise Linux 9 Package Manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/package_manifest/index
- NetworkManager nm-openvswitch manual: https://www.networkmanager.dev/docs/api/latest/nm-openvswitch.html
- NetworkManager nmcli manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- Open vSwitch Basic Configuration FAQ: https://docs.openvswitch.org/en/stable/faq/configuration/
- Open vSwitch VLAN how-to: https://docs.openvswitch.org/en/stable/howto/vlan/
- Open vSwitch VLAN FAQ: https://docs.openvswitch.org/en/latest/faq/vlan/
- ovs-vswitchd.conf.db(5): https://www.openvswitch.org/support/dist-docs/ovs-vswitchd.conf.db.5.html
- ovs-vsctl(8): https://www.openvswitch.org/support/dist-docs/ovs-vsctl.8.html
- ovs-ofctl(8): https://www.openvswitch.org/support/dist-docs/ovs-ofctl.8.pdf

## Issues Found
- The install command used `openvswitch3.1`, which is not the generic RHEL 9 package name used in Red Hat's RHEL 9 documentation. Changed it to install `openvswitch` and added `NetworkManager-ovs`, which is required for the later `nmcli` OVS connection types.
- The bridge IP comment did not make clear that the host IP belongs on the OVS bridge/internal interface rather than the physical NIC after the NIC is added to OVS. Updated the comment to avoid leaving IP configuration on the physical port.
- The OpenFlow example described `actions=output:1,output:3` as mirroring all traffic to a monitoring port. That is an OpenFlow forwarding rule, not the OVS mirror/SPAN configuration documented by OVS. Updated the comment to describe the command's actual behavior.
- The monitoring example described `ovs-ofctl snoop` as monitoring real-time flow matches. The command monitors OpenFlow messages on the switch snoop socket. Updated the comment accordingly.
- The NetworkManager persistence example only created the OVS bridge, an OVS port, and an internal interface for the bridge IP. NetworkManager OVS support requires explicit port and interface profiles, and the physical NIC also needs its own OVS port plus an Ethernet profile attached to that port. Updated the `nmcli` example to include those profiles.

## Review Notes
- The VLAN examples match OVS documented behavior: `tag` configures an access port, `trunks` restricts trunk VLANs, and `native-untagged` uses the `tag` value as the native VLAN.
- The OpenFlow output examples depend on OpenFlow port numbers. In a real deployment, readers should verify port numbers with `ovs-ofctl show br0` before using numeric `output` actions.
- The VXLAN example is syntactically valid for OVS, but a working tunnel also requires suitable underlay routing and firewall rules between the OVS hosts.
