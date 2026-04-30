# Validation Summary: How to Configure IPsec Tunnel Mode with IPv6 on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPsec ESP tunnel mode
- Linux XFRM (`ip xfrm`)
- strongSwan
- `swanctl`
- Linux `sysctl`
- `tcpdump`

## Sources Consulted
- strongSwan `swanctl.conf` documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan `swanctl --initiate` documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlInitiate.html
- strongSwan `swanctl --list-pols` documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlListPols.html
- strongSwan algorithm proposal documentation: https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan forwarding and routing notes: https://docs.strongswan.org/docs/latest/howtos/forwarding.html
- strongSwan introduction and route-install behavior: https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan `swanctl` directory documentation: https://docs.strongswan.org/docs/latest/swanctl/swanctlDir.html
- RFC 4106, AES-GCM for ESP: https://www.rfc-editor.org/rfc/rfc4106.html
- RFC 4301, Security Architecture for IP: https://www.rfc-editor.org/rfc/rfc4301
- RFC 4291, IPv6 address text representation: https://www.rfc-editor.org/rfc/rfc4291
- RFC 3849, IPv6 documentation prefix: https://www.rfc-editor.org/rfc/rfc3849.html
- Local `ip-xfrm(8)` man page from `iproute2`
- strongSwan project mailing list example of installed `dir out`/`dir in`/`dir fwd` XFRM policies: https://lists.strongswan.org/pipermail/users/2019-September/013852.html

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8:site1::/48` and `2001:db8:gw1::1`. IPv6 hextets must be hexadecimal, so these examples were replaced with valid documentation addresses under `2001:db8::/32`.
- The manual `ip xfrm state add` examples used AES-GCM key material of the wrong length for `rfc4106(gcm(aes))` with a 128-bit key. RFC 4106 requires 20 octets of keymat for AES-128-GCM-ESP (16-byte key plus 4-byte salt), so the sample keys were shortened accordingly.
- The manual `dir fwd` policy examples had incorrect traffic selectors for forwarded decrypted traffic. They were corrected to match the remote subnet as source and the local subnet as destination, consistent with Linux/strongSwan-installed forward policies.
- The `esp_proposals` example used an invalid strongSwan proposal string by including a PRF in an ESP proposal. It was corrected to `aes256gcm16-ecp256`, which is valid for CHILD_SA ESP proposals.
- The `swanctl --initiate` command used the wrong syntax. It was corrected from `swanctl --initiate child:site1-to-site2` to `swanctl --initiate --child site1-to-site2`.
- The post recommended `swanctl --list-pols` as a general status check, but the official command lists trap/drop/pass policies only. It was replaced with `ip xfrm policy list` for verifying installed kernel policies.
- The route-verification example searched for the literal text `site2`, which would never appear in actual route output, and implied XFRM policy replaces routing. It was corrected to check for the real subnet and to note that policy-based IPsec still depends on ordinary IPv6 routing.
- The strongSwan section only showed one gateway’s configuration without noting that the peer requires the mirrored configuration. The heading was clarified so the example is not misleading.

## Review Notes
- `/etc/swanctl/conf.d/*.conf` is included by default only when the installed `swanctl.conf` contains `include conf.d/*.conf`; strongSwan documents this as the default since 5.6.0.
- Manual `ip xfrm` configuration is valid for learning and troubleshooting, but production deployments should generally use IKE-based management such as strongSwan so rekeying, liveness detection, and SA lifecycle management are handled automatically.
