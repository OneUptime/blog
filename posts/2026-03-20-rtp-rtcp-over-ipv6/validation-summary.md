# Validation Summary: How to Configure RTP/RTCP over IPv6

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RTP
- RTCP
- SRTP
- IPv6
- SDP
- Python UDP sockets
- Asterisk PJSIP and RTP configuration
- ip6tables
- tcpdump
- ss

## Sources Consulted
- RFC 3550, RTP: A Transport Protocol for Real-Time Applications: https://datatracker.ietf.org/doc/html/rfc3550
- RFC 3551, RTP Profile for Audio and Video Conferences with Minimal Control: https://datatracker.ietf.org/doc/html/rfc3551
- RFC 3711, The Secure Real-time Transport Protocol (SRTP): https://www.rfc-editor.org/rfc/rfc3711
- RFC 5761, Multiplexing RTP Data and Control Packets on a Single Port: https://datatracker.ietf.org/doc/html/rfc5761
- RFC 8866, Session Description Protocol: https://datatracker.ietf.org/doc/html/rfc8866
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Python `secrets` module documentation: https://docs.python.org/3/library/secrets.html
- Asterisk `res_pjsip` configuration documentation: https://docs.asterisk.org/Asterisk_22_Documentation/API_Documentation/Module_Configuration/res_pjsip/
- Asterisk RTP configuration documentation: https://asterisk-doxygen.osso.pub/master/api/d7/d28/Config_rtp.html
- Asterisk IP Quality of Service documentation: https://docs.asterisk.org/Configuration/Channel-Drivers/IP-Quality-of-Service/
- Cisco libSRTP README: https://github.com/cisco/libsrtp
- Debian iptables persistence documentation: https://wiki.debian.org/iptables
- Local command help and filter compilation checks for `tcpdump`, `ip6tables`, and `ss`

## Issues Found
- The Python RTP example used fixed SSRC, sequence number, and timestamp initial values. RFC 3550 recommends unpredictable initial RTP sequence numbers, timestamps, and SSRC identifiers, so the example now uses Python's `secrets.randbits()` for those values.
- The Asterisk endpoint snippet did not allow any codec even though the SDP and Python examples use payload type 0 / PCMU. The snippet now includes `disallow=all` and `allow=ulaw`.
- The firewall persistence command wrote IPv6 rules to `/etc/ip6tables/rules.v6`, which is not the standard Debian/Ubuntu `iptables-persistent` path. It now writes to `/etc/iptables/rules.v6`.

## Review Notes
The code blocks are syntactically valid, and the `tcpdump` BPF filters compile locally. Modern Debian and Ubuntu systems often use the nftables backend for `iptables`/`ip6tables`; the commands remain valid through the compatibility tools, but a native `nft` ruleset may be preferable in future revisions.
