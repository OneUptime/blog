# Validation Summary: How to Set Up IPsec Transport Mode Between Two Linux Hosts

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- IPsec ESP transport mode
- Linux XFRM policy/state inspection with `ip xfrm`
- strongSwan legacy `ipsec.conf` / `ipsec.secrets` configuration
- strongSwan `ipsec` control command (`stroke` backend)
- Packet verification with `tcpdump`

## Sources Consulted
- [strongSwan: Introduction to strongSwan](https://docs.strongswan.org/docs/latest/howtos/introduction.html)
- [strongSwan: Introduction to the IPsec Protocol](https://docs.strongswan.org/docs/latest/howtos/ipsecProtocol.html)
- [strongSwan: strongswan.conf reference](https://docs.strongswan.org/docs/latest/config/strongswanConf.html)
- [strongSwan official source: `README_LEGACY.md`](https://raw.githubusercontent.com/strongswan/strongswan/master/README_LEGACY.md)
- [strongSwan official source: `ipsec.conf(5)`](https://raw.githubusercontent.com/strongswan/strongswan/master/man/ipsec.conf.5.in)
- [strongSwan official source: `ipsec.secrets(5)`](https://raw.githubusercontent.com/strongswan/strongswan/master/man/ipsec.secrets.5.in)
- [strongSwan official source: `ipsec` helper script](https://raw.githubusercontent.com/strongswan/strongswan/master/src/ipsec/_ipsec.in)
- [Cilium: IPsec Transparent Encryption](https://docs.cilium.io/en/stable/security/network/encryption-ipsec/)
- [RFC 4301: Security Architecture for the Internet Protocol](https://www.rfc-editor.org/rfc/rfc4301)

## Issues Found
1. The post presented `ipsec.conf` / `ipsec.secrets` and the `ipsec` command as generic current strongSwan usage. Current strongSwan documentation marks that backend as legacy/deprecated in favor of `swanctl.conf` and `swanctl`, so I added a short clarification to make the scope accurate without rewriting the article.
2. The startup command used `sudo systemctl restart strongswan`, which is not reliable for the legacy backend shown in the post because strongSwan package/service names differ by distro and packaging. I replaced it with `sudo ipsec restart`, which matches the documented legacy `ipsec` tooling used throughout the article.
3. The comment saying transport mode has "No leftsubnet/rightsubnet" was too absolute. Upstream `ipsec.conf(5)` documents that omitting them defaults the selectors to the host IPs, so I corrected the comment to describe the actual behavior.
4. The "Protecting Only Specific Traffic" example used `leftprotoport` / `rightprotoport`, which upstream `ipsec.conf(5)` marks as deprecated. I replaced that example with the current selector syntax using `leftsubnet=... [tcp/5432]` and `rightsubnet=... [tcp/5432]`.
5. The transport-mode usage notes overstated service-mesh/Cilium relationships. Current strongSwan documentation instead describes host-to-host protection and securing protocols such as L2TP or GRE, while current Cilium IPsec documentation does not support the article's exact transport-mode claim, so I narrowed that wording accordingly.

## Review Notes
- The post now accurately documents a legacy strongSwan configuration path. For new deployments, strongSwan's current documentation recommends `swanctl.conf` and `swanctl` instead of `ipsec.conf` and `ipsec`.
- Runtime validation on two live Linux hosts was not possible in this workspace, so the review relied on strongSwan upstream documentation/source, the relevant RFC, and local command checks.
- Local checks: `validation.json` was validated with `jq`; `ip xfrm help` was used to confirm the `state`/`policy` command family; `tcpdump --version` was used to confirm the capture tool syntax context available in the workspace.
