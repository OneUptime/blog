# Validation Summary: How to Allow ESP Protocol Traffic Through iptables

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `iptables`
- IPsec
- ESP (IP protocol 50)
- AH (IP protocol 51)
- IKE / NAT-T
- `tcpdump`
- `ip xfrm`

## Sources Consulted
- `iptables(8)` man page: https://man7.org/linux/man-pages/man8/iptables.8.html
- `iptables-extensions(8)` man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `iptables-save(8)` man page: https://man7.org/linux/man-pages/man8/iptables-save.8.html
- `pcap-filter(7)` man page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `ip-xfrm(8)` man page: https://man7.org/linux/man-pages/man8/ip-xfrm.8.html
- RFC 4303, IP Encapsulating Security Payload (ESP): https://www.rfc-editor.org/rfc/rfc4303.html
- RFC 3948, UDP Encapsulation of IPsec ESP Packets: https://www.rfc-editor.org/rfc/rfc3948.html
- RFC 7296, Internet Key Exchange Protocol Version 2 (IKEv2): https://www.rfc-editor.org/rfc/rfc7296.html
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers/protocol-numbers.xhtml
- `netfilter-persistent(8)` Debian man page: https://manpages.debian.org/unstable/netfilter-persistent/netfilter-persistent.8.en.html

## Issues Found
- The manual persistence command used `sudo iptables-save > /etc/iptables/rules.v4`, which is a broken pattern because the shell redirection is not performed with elevated privileges. I changed it to `sudo iptables-save -f /etc/iptables/rules.v4`, which is supported by `iptables-save(8)`.
- The persistence section referred to `/etc/rc.local` with the comment "Verify rules at boot", which was misleading and not necessary for the documented workflow. I replaced it with a direct `sudo iptables-restore < /etc/iptables/rules.v4` restore command.
- The verification section suggested checking ESP with `conntrack` and stated that ESP is not tracked by default. That was not a reliable or authoritative validation step for this post, so I replaced it with `sudo ip xfrm state list` and `sudo ip xfrm policy list`, which directly inspect kernel IPsec state and policy.
- The packet-capture guidance incorrectly implied that seeing IKE without raw ESP always means the firewall is blocking ESP. I corrected this to note that when NAT-T is in use, encrypted payloads may appear on UDP port `4500` instead of native IP protocol `50`.
- The concluding claim overstated that allowing IP protocol `50` is always required for IPsec traffic. I narrowed it to the accurate case: native ESP without NAT-T.

## Review Notes
- The post is technically relevant and salvageable; after the fixes above, the core `iptables` rule syntax and the `policy` match examples are accurate.
- The article is specifically about `iptables`. On many modern Linux distributions, `iptables` is implemented via the nftables backend, but the documented commands remain valid in current releases.
