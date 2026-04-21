# Validation Summary: How to Troubleshoot IPsec IPv6 Connection Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- IPv6
- IPsec and ESP
- IKEv2
- strongSwan and swanctl
- Linux XFRM
- nmap
- tcpdump
- ip6tables and TCP MSS clamping

## Sources Consulted
- strongSwan logging documentation: https://docs.strongswan.org/docs/latest/config/logging.html
- strongSwan algorithm proposal documentation: https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan swanctl.conf documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan swanctl tool documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctl.html
- Nmap UDP scan documentation: https://nmap.org/book/man-port-scanning-techniques.html
- Nmap port specification documentation: https://nmap.org/book/man-port-specification.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 7296, Internet Key Exchange Protocol Version 2: https://www.rfc-editor.org/rfc/rfc7296.html
- RFC 4303, IP Encapsulating Security Payload: https://datatracker.ietf.org/doc/html/rfc4303
- RFC 8200, Internet Protocol Version 6 Specification: https://datatracker.ietf.org/doc/rfc8200/
- Linux ip-xfrm manual: https://man7.org/linux/man-pages/man8/ip-xfrm.8.html
- Debian iptables-extensions TCPMSS manual: https://manpages.debian.org/unstable/iptables/iptables-extensions.8.en.html
- Author GitHub profile link: https://github.com/nawazdhandala
- Local command help for `ping6` and `ip xfrm policy`

## Issues Found
- Several example IPv6 addresses used labels inside hextets, such as `2001:db8:gw2::1` and `2001:db8:site1::/48`. IPv6 text fields must be hexadecimal, so these examples would fail in commands. Replaced them with valid documentation-prefix addresses such as `2001:db8:100::1`, `2001:db8:1::/48`, and `2001:db8:2::/48`.
- The nmap UDP-port check omitted `-sU`, so it would not explicitly run a UDP scan. Updated the command to `nmap -6 -sU -p 500,4500 2001:db8:100::1`.
- The strongSwan `filelog` examples used `/var/log/charon.log` as a section name. Current strongSwan logging documentation requires an arbitrary logger section name with `path = /var/log/charon.log` for paths containing dots. Updated both logging snippets to use `charon-log` plus `path`.
- The certificate-debug logging snippet had an invalid `strongswan:` line, used `cert = 4` even though `cert` is not a strongSwan logging subsystem, and used `!` as an inline comment even though strongSwan configuration comments use `#`. Replaced this with `asn = 2` and `cfg = 2` under the file logger, with a valid `#` comment.
- The ESP proposal example included `prfsha256` and used the older `aes256gcm128` naming style. ESP proposals do not include PRF transforms; strongSwan's current examples use `aes256gcm16`. Updated the example to `esp_proposals = aes256gcm16-ecp256`.
- The proposal guidance said both peers must have identical proposals. strongSwan selects an accepted compatible proposal from configured and received proposals, so exact identity is not required. Updated the wording to "compatible" and "at least one compatible proposal."
- The route and firewall grep examples searched for the literal word `site2`, which would not normally appear in Linux route or ip6tables output. Updated them to search for the example remote prefix `2001:db8:2::/48`.
- The firewall diagnosis comment stated that no response means the remote firewall is blocking. That was too narrow; it could also be the path or responder. Updated the comment accordingly.
- The MTU overhead comment gave a fixed `~50-80 bytes` range. ESP overhead varies by mode, cipher, padding, and UDP encapsulation. Updated the statement to `often 50-100+ bytes depending on mode, cipher, and encapsulation`.

## Review Notes
- `ping6` and `ip6tables` remain usable on common Linux systems, but many modern distributions expose `ping -6` and nftables-backed iptables compatibility. A future refresh could include nftables equivalents.
- The strongSwan systemd unit name can vary by distribution, so `systemctl restart strongswan` and `journalctl -u strongswan` may need local adjustment on some systems.
- UDP scans can return `open|filtered` when no UDP response is received, so nmap output should be interpreted with packet captures or responder logs during real troubleshooting.
