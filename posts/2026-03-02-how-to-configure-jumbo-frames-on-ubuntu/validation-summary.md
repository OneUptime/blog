# Validation Summary: How to Configure Jumbo Frames on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu networking
- Linux MTU and jumbo frames
- Netplan
- NetworkManager / nmcli
- iproute2
- ping and Path MTU Discovery
- tracepath and nmap path-mtu
- iperf3
- NFS
- open-iscsi / iSCSI
- tcpdump and iptables

## Sources Consulted
- Ubuntu Server documentation: Configuring networks with Netplan - https://ubuntu.com/server/docs/explanation/networking/configuring-networks/
- Netplan YAML reference - https://netplan.readthedocs.io/en/stable/netplan-yaml/
- NetworkManager nm-settings-nmcli reference - https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- iputils ping local help output (`ping -h`)
- iproute2 local manual page (`ip-link(8)`)
- Debian iperf3 manual page - https://manpages.debian.org/bookworm/iperf3/iperf3.1.en.html
- Nmap NSE path-mtu documentation - https://nmap.org/nsedoc/scripts/path-mtu.html
- RFC 1191, Path MTU Discovery - https://www.ietf.org/rfc/rfc1191.txt
- RFC 894, IP Datagrams over Ethernet - https://www.ietf.org/rfc/rfc894.txt
- Linux NFS nfs(5) manual page - https://www.man7.org/linux/man-pages/man5/nfs.5.html
- Ubuntu Server documentation: iSCSI initiator - https://ubuntu.com/server/docs/how-to/storage/iscsi-initiator-or-client/
- Linux kernel bonding documentation - https://docs.kernel.org/networking/bonding.html

## Issues Found
- The VLAN section said a parent MTU of 9000 supports a VLAN MTU of 8996 because of the 4-byte VLAN tag, while the example set the VLAN MTU to 9000. This confused IP MTU with Ethernet frame overhead. Updated the text to state that VLAN tags add 4 bytes on the wire and that the NIC/switch path must be able to carry that overhead.
- The ping examples described the tested sizes as Ethernet frames. `ping -s` controls ICMP payload size, and the calculation shown is for IPv4 packet size including IP and ICMP headers, not full Ethernet frame size. Updated the comments to say "IPv4 packet."
- The NFS section recommended `rsize=65536,wsize=65536` as large read/write sizes. Current Linux NFS clients support up to 1048576 bytes and often negotiate large values automatically. Updated the wording and examples to use `1048576`.
- The iSCSI section implied MTU should be configured in `/etc/iscsi/iscsid.conf`, but open-iscsi uses the system network interface MTU. Replaced the misleading edit command with an interface MTU verification command and kept the explanation focused on Netplan/interface configuration.

## Review Notes
The core Netplan, NetworkManager, iproute2, ping, nmap, iperf3, tcpdump, and iptables commands are syntactically valid. In production, the exact maximum MTU and performance benefit remain hardware-, driver-, and switch-dependent, so operators should verify end-to-end behavior before enabling jumbo frames broadly.
