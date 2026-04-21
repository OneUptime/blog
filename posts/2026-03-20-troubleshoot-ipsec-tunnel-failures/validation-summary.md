# Validation Summary: How to Troubleshoot IPsec VPN Tunnel Establishment Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- IPsec and IKEv2
- strongSwan with ipsec.conf/starter/stroke commands
- Linux XFRM policies
- Linux packet forwarding
- iptables/netfilter policy matching
- NAT Traversal (NAT-T)
- tcpdump, pcap filters, and Wireshark
- OpenBSD netcat (`nc`)

## Sources Consulted
- strongSwan Introduction and IKE/IPsec basics: https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan NAT Traversal documentation: https://docs.strongswan.org/docs/latest/features/natTraversal.html
- strongSwan Algorithm Proposals documentation: https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan 6.0 notes on deprecated stroke interface: https://docs.strongswan.org/docs/latest/news/whatsNew.html
- strongSwan `ipsec.conf(5)` man page: https://manpages.debian.org/trixie/strongswan-starter/ipsec.conf.5.en.html
- strongSwan `ipsec.secrets(5)` man page: https://manpages.debian.org/trixie/strongswan-starter/ipsec.secrets.5.en.html
- strongSwan `strongswan.conf(5)` logging man page: https://manpages.debian.org/trixie/libstrongswan/strongswan.conf.5.en.html
- RFC 7296, Internet Key Exchange Protocol Version 2 (IKEv2): https://www.rfc-editor.org/rfc/rfc7296.html
- RFC 4301, Security Architecture for IP: https://datatracker.ietf.org/doc/rfc4301/
- RFC 3948, UDP Encapsulation of IPsec ESP Packets: https://datatracker.ietf.org/doc/rfc3948/
- Linux `ip-xfrm(8)` man page: https://man7.org/linux/man-pages/man8/ip-xfrm.8.html
- Linux `iptables-extensions(8)` man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux `tcpdump(8)` and `pcap-filter(7)` man pages: https://man7.org/linux/man-pages/man8/tcpdump.8.html and https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- OpenBSD `nc(1)` man page: https://man.openbsd.org/nc.1
- Wireshark IKEv2 decryption table documentation: https://www.wireshark.org/docs/wsug_html_chunked/ChIKEv2DecryptionSection.html

## Issues Found
- UDP `nc -zuv` checks were described as definitive port-open tests. Updated the comments to state that UDP probes are only a reachability hint and that timeouts are inconclusive.
- strongSwan logging examples did not mention that `ipsec stroke` is the legacy ipsec.conf/stroke interface or that log level 4 may expose sensitive key material. Added both caveats and noted that the systemd unit name may vary by distribution.
- IKEv2 log interpretation used older "Phase 1/Phase 2" wording and less accurate example messages. Updated the wording to IKE SA and Child SA terminology and adjusted the example log strings.
- The proposal troubleshooting note said removing `!` allowed fallback. Updated it to the more precise strongSwan behavior: removing a trailing `!` makes the proposal non-strict and lets strongSwan add default proposals.
- The PSK example used `grep` without privilege escalation and overemphasized whitespace. Changed it to `sudo grep` and clarified that the quoted secret must match exactly on both peers.
- `ipsec statusall | grep "Traffic Selectors"` does not match typical strongSwan `ipsec statusall` output. Replaced it with `grep -A2 "INSTALLED"` to show the Child SA and selector lines.
- The traffic test used `ping -I <LAN_INTERFACE>`, which may not choose a source inside the local traffic selector. Updated it to use `<LOCAL_SUBNET_IP>`.
- NAT-T verification used `grep "NAT-T"` and expected local/remote port output that `ipsec statusall` does not reliably show. Replaced it with a check for `ESP in UDP SPIs`.
- AH was listed as a required firewall rule for all tunnels. Updated the firewall section to mark AH as optional and only needed when AH is actually used.
- The Wireshark note said the dissector shows the full negotiation. Updated it to note that encrypted IKEv2 payloads require keys.
- The final NAT checklist item was worded backwards. Updated it to check for NAT between gateways or blocked ESP.

## Review Notes
- The post is now accurate for strongSwan starter/ipsec.conf deployments. Modern strongSwan deployments generally use VICI and `swanctl`; the stroke interface is deprecated and is not enabled by default in strongSwan 6.0.
- The iptables examples are syntactically valid, but many current Linux distributions use the nftables backend or native nftables rules. A future revision could add nftables equivalents.
- The local environment did not have the `ipsec` command installed, so strongSwan command behavior was verified against documentation and man pages rather than executed locally. Local help/syntax checks were performed for `nc`, `iptables`, `ip xfrm`, and `tcpdump`.
