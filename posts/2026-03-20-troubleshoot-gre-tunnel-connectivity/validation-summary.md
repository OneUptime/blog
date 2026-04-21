# Validation Summary: How to Troubleshoot GRE Tunnel Connectivity Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Linux networking
- GRE tunnels
- iproute2
- iptables
- nftables
- tcpdump/libpcap filters
- Linux kernel modules and sysctl

## Sources Consulted
- RFC 2784, Generic Routing Encapsulation (GRE): https://datatracker.ietf.org/doc/html/rfc2784
- IANA Assigned Internet Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- Linux kernel operational state documentation: https://docs.kernel.org/networking/operstates.html
- Red Hat Enterprise Linux 9 documentation, Configuring IP tunnels: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-ip-tunnels_configuring-and-managing-networking
- nftables official manpage: https://netfilter.org/projects/nftables/manpage.html
- pcap-filter(7) Linux manual page for tcpdump/libpcap filter syntax: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local command references: `ip -Version`, `ip tunnel help`, `ip link help`, `ip route help`, `iptables --help`, `iptables-translate`, `tcpdump -d 'proto gre'`, `modinfo ip_gre`, `getent protocols gre`

## Issues Found
- The examples used `gre0` as the configured tunnel interface. On Linux, `gre0` is commonly the default/reserved GRE device created by the kernel module, so the examples now use `gre1`.
- The post said to look for `state UP LOWER_UP`. Linux separates administrative and operational state, and tunnel/soft devices can be administratively `UP` while showing `state UNKNOWN`. Updated the guidance to look for `UP` in the flags and note that GRE tunnels may show `state UNKNOWN`.
- The underlay ping section implied any ping failure proves GRE cannot work. ICMP echo can be filtered independently, so the wording now limits that conclusion to host or route reachability failures.
- The `ip_gre` module check treated absence from `lsmod` as only "module not loaded." GRE support can also be built into the kernel, so the post now calls out modular versus built-in support.
- The sample `ip -d tunnel show` output used `local=... remote=...`, which does not match typical iproute2 output. Updated it to `local ... remote ...`.
- The route example added a route via the tunnel peer but omitted the tunnel device. Updated it to `ip route add 192.168.2.0/24 via 172.16.0.2 dev gre1`.
- The summary table incorrectly mapped a down tunnel interface to underlay reachability. Updated it to administrative state or missing tunnel configuration.
- The statistics guidance said no RX means the remote end is not sending back. Updated it to the more accurate condition that return traffic is not reaching or decapsulating on the local host.
- The conclusion said to verify the `ip_gre` module is loaded. Updated it to verify GRE kernel support is available.

## Review Notes
- The post is accurate for IPv4 GRE on Linux using `ip_gre`. IPv6 GRE/IP6GRE would require different tunnel and firewall syntax.
- The nftables examples assume an `inet filter` table with `input` and `output` chains already exists.
- `tcpdump proto gre` was verified with libpcap filter compilation; `proto 47` is an equivalent numeric form.
