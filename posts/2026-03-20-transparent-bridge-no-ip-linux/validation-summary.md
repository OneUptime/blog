# Validation Summary: How to Set Up a Transparent Bridge (No IP Address) on Linux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux bridge
- iproute2 `ip` and `bridge`
- br_netfilter bridge netfilter
- iptables/ip6tables
- ebtables
- nftables bridge filtering
- tcpdump
- Debian `/etc/network/interfaces`

## Sources Consulted
- Linux kernel Ethernet Bridging documentation: https://docs.kernel.org/networking/bridge.html
- `ip-link(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `bridge(8)` Linux manual page: https://man7.org/linux/man-pages/man8/bridge.8.html
- Netfilter nftables manual page: https://netfilter.org/projects/nftables/manpage.html
- Netfilter nftables bridge filtering documentation: https://wiki.nftables.org/wiki-nftables/index.php/Bridge_filtering
- Debian `ebtables(8)` manual page: https://manpages.debian.org/testing/ebtables/ebtables.8.en.html
- Debian `bridge-utils-interfaces(5)` manual page: https://manpages.debian.org/buster/bridge-utils/bridge-utils-interfaces.5.en.html
- Debian `tcpdump(8)` manual page: https://manpages.debian.org/trixie/tcpdump/tcpdump.8.en.html
- Local CLI help/version output for `iproute2-6.1.0`, `iptables/ebtables v1.8.10 (nf_tables)`, `tcpdump 4.99.4`, and `sysctl` from procps-ng 4.0.4.

## Issues Found
- The post said a no-IP bridge is "nearly invisible on the network." A bridge still exists at Layer 2, so this was clarified to "nearly invisible at Layer 3."
- The bridge creation example did not ensure the member interfaces were free of IP addresses. Added `ip addr flush dev eth0` and `ip addr flush dev eth1`, and added a Debian persistent configuration note not to assign addresses to the bridge ports elsewhere.
- The bridge netfilter example set `net.bridge.bridge-nf-call-*` sysctls without loading `br_netfilter`. Added `modprobe br_netfilter` before the sysctl commands.
- The firewall section treated ebtables/iptables as the main choices without noting current nftables bridge filtering. Added a concise note that nftables bridge filtering is preferred for new configurations and that iptables bridge-netfilter is a legacy path.
- The iptables example was described as intercepting bridged traffic generally, but `iptables` is IPv4-specific. Updated the wording to "bridged IPv4 traffic."
- The ebtables TCP port 80 example accepted destination port 80 and then dropped everything else, which would also drop return traffic from source port 80. Added a matching `--ip-sport 80` rule and used the documented `TCP` protocol name.

## Review Notes
- The commands assume root privileges and that `eth0` and `eth1` are the intended physical bridge ports.
- Disabling STP is syntactically valid and matches the post, but production deployments should only disable STP when loops are impossible or handled elsewhere.
- `br_netfilter` is only needed for iptables/ip6tables inspection of bridged traffic; ebtables and nftables bridge-family rules do not require it.
