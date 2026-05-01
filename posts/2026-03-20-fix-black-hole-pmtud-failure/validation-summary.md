# Validation Summary: How to Fix Black Hole Router Issues Caused by PMTUD Failure

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 PMTUD
- ICMP Type 3 Code 4
- TCP MSS clamping
- Linux `iptables`
- Linux `ping`, `tcpdump`, `tracepath`, `ss`, and `sysctl`
- AWS EC2 security groups and VPC network ACLs

## Sources Consulted
- RFC 1191: Path MTU Discovery - https://www.rfc-editor.org/rfc/rfc1191
- RFC 2923: TCP Problems with Path MTU Discovery - https://www.rfc-editor.org/rfc/rfc2923.html
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ping(8)` Linux man page - https://man7.org/linux/man-pages/man8/ping.8.html
- `ip(7)` Linux man page - https://man7.org/linux/man-pages/man7/ip.7.html
- `ip-route(8)` Linux man page - https://man7.org/linux/man-pages/man8/ip-route.8.html
- `ss(8)` Linux man page - https://man7.org/linux/man-pages/man8/ss.8.html
- `iptables-extensions(8)` Linux man page - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Amazon EC2 MTU/PMTUD documentation - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html
- Amazon EC2 instance MTU and `tracepath` documentation - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-mtu.html
- Amazon VPC PMTUD and network ACL documentation - https://docs.aws.amazon.com/vpc/latest/userguide/path_mtu_discovery.html
- AWS CLI `authorize-security-group-ingress` reference - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html

## Issues Found
- The TCP stall check piped `curl` into `head -30`, which could terminate the command before the transfer stall was observable. I changed it to a time-bounded `curl` invocation that actually demonstrates the hang.
- The MSS inspection example started `curl` before `tcpdump`, so it could miss the SYN packet it claimed to inspect. I reversed the order and clarified that the step is inspecting the advertised MSS, not changing it.
- The ICMP diagnosis text said that seeing no ICMP conclusively meant a firewall was blocking it. I corrected that to the narrower, accurate statement that the ICMP is not reaching the host.
- The AWS security-group CLI example was wrong for ICMP Type 3 Code 4. I replaced it with the documented `--ip-permissions 'IpProtocol=icmp,FromPort=3,ToPort=4,...'` form and noted that network ACLs can also block PMTUD.
- The `iptables-save > /etc/iptables/rules.v4` persistence step was presented as generic Linux behavior. I narrowed it to a Debian/Ubuntu example and kept the general advice distro-neutral.
- The fixed-MSS comment now explicitly shows the IPv4 header and TCP header subtraction instead of the oversimplified `path-MTU - 40` shorthand.
- The post said to apply MSS clamping to OUTPUT for "outbound AND inbound traffic." I corrected this to explain that FORWARD is for routed traffic and OUTPUT only applies to TCP sessions originated by the Linux host itself.
- The PMTUD override section described `net.ipv4.route.min_pmtu` as a fixed MTU hint and used obsolete IPv4 route-cache commands. I corrected the sysctl explanation and replaced the stale cache inspection guidance with `ss -ti`, which exposes the live socket PMTU.
- The verification section incorrectly implied that a successful large DF ping is expected after every fix and used `ip route show cache`, which is obsolete on modern Linux. I changed the test expectations to "no silent black hole" semantics and updated the PMTU inspection method.

## Review Notes
- The post is intentionally IPv4-focused. The IPv6 equivalent uses ICMPv6 Packet Too Big (Type 2), and `TCPMSS --clamp-mss-to-pmtu` uses a different header subtraction for IPv6.
