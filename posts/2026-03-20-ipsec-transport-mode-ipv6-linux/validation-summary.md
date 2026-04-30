# Validation Summary: How to Configure IPsec Transport Mode with IPv6 on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux IPsec/XFRM
- `ip xfrm`
- IPv6
- ESP transport mode
- strongSwan
- `swanctl`
- systemd

## Sources Consulted
- `man 8 ip-xfrm` and local `ip xfrm state help` / `ip xfrm policy help`
- RFC 4106: The Use of Galois/Counter Mode (GCM) in IPsec ESP - https://www.rfc-editor.org/rfc/rfc4106.html
- RFC 4303: IP Encapsulating Security Payload (ESP) - https://www.rfc-editor.org/rfc/rfc4303.html
- strongSwan `swanctl.conf` reference - https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan Algorithm Proposals reference - https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan `swanctl --initiate` reference - https://docs.strongswan.org/docs/latest/swanctl/swanctlInitiate.html
- strongSwan `swanctl --load-all` reference - https://docs.strongswan.org/docs/latest/swanctl/swanctlLoadAll.html
- strongSwan `swanctl` directory reference - https://docs.strongswan.org/docs/latest/swanctl/swanctlDir.html

## Issues Found
- The manual `ip xfrm state add` examples used invalid AES-GCM key material lengths for `rfc4106(gcm(aes))`. RFC 4106 requires 20 octets for AES-128-GCM ESP keying material, so the example keys were replaced with valid 20-octet values.
- The strongSwan CHILD ESP proposal incorrectly included `prfsha256`. For `esp_proposals`, strongSwan documents AEAD ESP proposals as `aes256gcm...` with an optional DH group, not a PRF, so the proposal was corrected to `aes256gcm128-ecp256`.
- The strongSwan initiation command used the wrong syntax. `swanctl --initiate child:transport-tcp` was corrected to `swanctl --initiate --child transport-tcp` per the command reference.
- The strongSwan example only showed the Host A config. A note was added stating that Host B must use the same configuration with local/remote addresses, IDs, and traffic selectors swapped.
- The persistence section used unsupported `ip xfrm state restore` and `ip xfrm policy restore` commands. These were replaced with a supported `ip -batch` workflow plus a `systemd` oneshot unit.
- The Host A / Host B manual configuration headings were corrected so the command blocks are associated with the right host.
- The summary text was clarified so it correctly describes matching outbound and inbound SA pairs across the two hosts.

## Review Notes
- The `/etc/swanctl/conf.d/*.conf` path assumes the default `include conf.d/*.conf` line is present in `swanctl.conf`, which strongSwan documents as part of the default configuration since 5.6.0.
- The verification example uses `eth0`; systems with predictable interface names may need a different interface name.
